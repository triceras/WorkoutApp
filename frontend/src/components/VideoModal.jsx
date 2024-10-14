// src/components/VideoModal.jsx

import React from 'react';
import Modal from 'react-modal';
import './VideoModal.css';

Modal.setAppElement('#root'); // Important for accessibility

const VideoModal = ({ isOpen, onRequestClose, videoId }) => {
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            contentLabel="Exercise Video"
            className="video-modal"
            overlayClassName="video-overlay"
        >
            <button onClick={onRequestClose} className="close-button">&times;</button>
            <div className="video-container">
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="Exercise Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </Modal>
    );
};

export default VideoModal;
