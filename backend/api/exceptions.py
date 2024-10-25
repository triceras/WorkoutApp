# backend/api/exceptions.py

class ReplicateServiceUnavailable(Exception):
    """Exception raised when the Replicate service is unavailable."""
    pass

class AIServiceUnavailable(Exception):
    """Exception raised when the AI service is unavailable."""
    pass

class ImageGenerationError(Exception):
    """Exception raised when image generation fails."""
    pass
