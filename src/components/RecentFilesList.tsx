import React from 'react';
import { ListGroup } from 'react-bootstrap';

interface RecentFilesListProps {
    files: string[];
    onOpenFile: (filePath: string) => void;
}

const RecentFilesList: React.FC<RecentFilesListProps> = ({ files, onOpenFile }) => {
    const getFileName = (filePath: string) => {
        // A simple function to extract the filename from a path without using Node's path module
        const parts = filePath.split(/[\\\/]/);
        return parts[parts.length - 1];
    };

    return (
        <div>
            <h5 className="mb-3">Recent Files</h5>

            {files.length === 0 ? (
                <p className="text-muted">No recent files</p>
            ) : (
                <ListGroup variant="flush">
                    {files.map((filePath, index) => (
                        <ListGroup.Item
                            key={index}
                            action
                            className="file-item"
                            onClick={() => onOpenFile(filePath)}
                            title={filePath}
                        >
                            {getFileName(filePath)}
                            <div className="text-muted small">{filePath}</div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
        </div>
    );
};

export default RecentFilesList;
