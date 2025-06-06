/**
 * Utility functions for handling hierarchical tree data
 */

import { useMemo } from 'react';

interface TreeNode {
    key: string;
    fullPath: string;
    children: { [key: string]: TreeNode };
    isExpanded: boolean;
}

/**
 * Convert a flat list of keys to a tree structure
 */
export const useTreeStructure = (keys: string[], nestedMode: boolean) => {
    return useMemo(() => {
        if (!nestedMode) {
            return { key: '', fullPath: '', children: {}, isExpanded: true };
        }

        const root: TreeNode = { key: '', fullPath: '', children: {}, isExpanded: true };

        keys.forEach((key) => {
            const parts = key.split('.');
            let currentNode = root;

            parts.forEach((part, index) => {
                const currentPath = parts.slice(0, index + 1).join('.');

                if (!currentNode.children[part]) {
                    currentNode.children[part] = {
                        key: part,
                        fullPath: currentPath,
                        children: {},
                        isExpanded: false
                    };
                }

                currentNode = currentNode.children[part];
            });
        });

        return root;
    }, [keys, nestedMode]);
};

/**
 * Filter nodes that match search term or have children that match
 */
export const nodeMatchesSearch = (node: TreeNode, searchTerm: string, depth = 0, maxDepth = 20): boolean => {
    if (depth > maxDepth) return false; // Prevent infinite recursion

    // Check if the node itself matches
    if (node.fullPath.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
    }

    // Check if any children match
    for (const childKey in node.children) {
        if (nodeMatchesSearch(node.children[childKey], searchTerm, depth + 1, maxDepth)) {
            return true;
        }
    }

    return false;
};

/**
 * Check if any nodes in path are expanded (for efficient rendering)
 */
export const shouldRenderChildren = (node: TreeNode, expandedNodes: Set<string>, searchTerm: string): boolean => {
    return expandedNodes.has(node.fullPath) || !!searchTerm;
};
