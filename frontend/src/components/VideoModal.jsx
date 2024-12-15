// src/components/VideoModal.jsx

import React from 'react';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import './VideoModal.css';

Modal.setAppElement('#root'); // Important for accessibility

const VideoModal = ({ isOpen, onRequestClose, videoId }) => {
    if (!videoId) return null;
    
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            contentLabel="Exercise Video"
            className="video-modal"
            overlayClassName="video-overlay"
            shouldCloseOnOverlayClick={true}
            shouldCloseOnEsc={true}
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

VideoModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    videoId: PropTypes.string
};

export default VideoModal;
