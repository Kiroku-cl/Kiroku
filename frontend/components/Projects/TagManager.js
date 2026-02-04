"use client";

import { useState, useRef, useEffect } from "react";

export default function TagManager({ 
  projectId, 
  currentTags = [], 
  userTags = [], 
  onTagsChange,
  maxTags = 5 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);
  
  const handleAddNewTag = async () => {
    if (!newTagName.trim() || currentTags.length >= maxTags) return;
    
    setIsAdding(true);
    try {
      const res = await fetch(`/api/project/${projectId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tag_name: newTagName.trim() })
      });
      
      if (res.ok) {
        const data = await res.json();
        onTagsChange([...currentTags, data.tag]);
        setNewTagName("");
        // Don't close dropdown
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleSelectExistingTag = async (tag) => {
    if (currentTags.length >= maxTags) return;
    if (currentTags.find(t => t.id === tag.id)) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/project/${projectId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tag_id: tag.id })
      });
      
      if (res.ok) {
        onTagsChange([...currentTags, tag]);
        // Don't close dropdown
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveTag = async (tagId) => {
    try {
      const res = await fetch(`/api/project/${projectId}/tags/${tagId}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (res.ok) {
        onTagsChange(currentTags.filter(t => t.id !== tagId));
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };
  
  // Filter out already selected tags
  const availableTags = userTags.filter(
    tag => !currentTags.find(t => t.id === tag.id)
  );
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current tags display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {currentTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-sm"
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
              aria-label="Quitar tag"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      
      {/* Add tag button */}
      {currentTags.length < maxTags && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
        >
          + Añadir tag
        </button>
      )}
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* New tag input */}
          <div className="p-2 border-b">
            <div className="flex gap-1">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNewTag()}
                placeholder="Nuevo tag..."
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={50}
                autoFocus
              />
              <button
                onClick={handleAddNewTag}
                disabled={!newTagName.trim() || isAdding || currentTags.length >= maxTags}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                +
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {currentTags.length}/{maxTags} tags
            </div>
          </div>
          
          {/* Existing tags list */}
          <div className="max-h-48 overflow-y-auto">
            {availableTags.length > 0 ? (
              availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleSelectExistingTag(tag)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 touch-manipulation"
                >
                  {tag.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                No hay tags disponibles
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Info text when max tags reached */}
      {currentTags.length >= maxTags && (
        <p className="mt-1 text-xs text-gray-500">
          Máximo de {maxTags} tags alcanzado
        </p>
      )}
    </div>
  );
}