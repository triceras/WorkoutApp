# backend/myfitnessapp/settings.py

from pathlib import Path
import os
import environ
from dotenv import load_dotenv  # Ensure python-dotenv is installed
from django.conf import settings
from django.conf.urls.static import static
import logging.config
from celery.schedules import crontab
import logging

# Load environment variables from .env
load_dotenv()

# Define BASE_DIR once
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-default-secret-key')

# Now, environment variables like REPLICATE_API_TOKEN can be accessed
REPLICATE_API_TOKEN = os.getenv('REPLICATE_API_TOKEN')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",  # Must be included
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    'corsheaders',
    'django.contrib.sites',
    'django_extensions',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'api',
    'rest_framework',
    'rest_framework.authtoken',
    'channels',  # Add this line
    'csp',
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # Should be high in the list
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "myfitnessapp.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],  # Add template directories if any
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",  # Required by allauth
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "myfitnessapp.wsgi.application"
ASGI_APPLICATION = "myfitnessapp.asgi.application"  # For Channels

# Channels configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],  # Adjust host and port if necessary
        },
    },
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# WebSocket specific settings
CHANNEL_LAYERS_MAX_RETRIES = 30
CHANNEL_LAYERS_RETRY_DELAY = 1

# WebSocket Configuration
WEBSOCKET_URL = "/ws/"
WEBSOCKET_ACCEPT_ALL = True  # For development only

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DATABASE_NAME', 'fitnessdb'),
        'USER': os.getenv('DATABASE_USER', 'rafael'),
        'PASSWORD': os.getenv('DATABASE_PASSWORD', '1234'),
        'HOST': os.getenv('DATABASE_HOST', 'localhost'),
        'PORT': os.getenv('DATABASE_PORT', '5432'),
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    # Add other validators as needed
]

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files (User uploaded files)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# In development, you typically don't need to set STATIC_ROOT.
# STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Only for production

DEBUG = True

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS Configuration
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:3000$",
]

# Add CORS headers for WebSocket connections
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'sec-websocket-protocol',
    'sec-websocket-key',
    'sec-websocket-version',
    'sec-websocket-extensions',
]

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        # Optionally include SessionAuthentication
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# Authentication Backends
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

SITE_ID = 1

ACCOUNT_EMAIL_VERIFICATION = 'none'
ACCOUNT_AUTHENTICATION_METHOD = 'username'
ACCOUNT_EMAIL_REQUIRED = False

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    }
}

# Define BASE_DIR once
BASE_DIR = Path(__file__).resolve().parent.parent

# Ensure the logs directory exists
LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,  # Retain the default Django loggers
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {name} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'DEBUG',  # Capture all levels (DEBUG and above)
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOG_DIR, 'django.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',  # Capture all levels (DEBUG and above)
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'DEBUG',  # Set to DEBUG to capture all messages
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'api': {  # Your app's main logger
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,  # Allow messages to bubble up to root
        },
        'api.middleware': {  # Middleware-specific logger
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,  # Allow messages to bubble up to 'api' and 'root'
        },
        'api.consumers': {  # Consumers-specific logger
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,  # Allow messages to bubble up to 'api' and 'root'
        },
        # Remove the logger with key '' to avoid ambiguity
    },
}

# LOGGING['handlers']['file']['filename'] = os.path.join(BASE_DIR, 'logs', 'django.log')
# os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)

AUTH_USER_MODEL = 'api.User'

# Celery Configuration Options
CELERY_BROKER_URL = 'redis://localhost:6379/0'  # Redis broker
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

CELERY_BEAT_SCHEDULE = {
    'send-feedback-every-monday-morning': {
        'task': 'api.tasks.process_feedback_submission_task',
        'schedule': crontab(hour=0, minute=0, day_of_week=1),  # Every Monday at 00:00 UTC
    }
}

# ./backend/myfitnessapp/settings.py

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",  # Use DB 1 for caching
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

# Cache timeout for YouTube video IDs (24 hours)
YOUTUBE_VIDEO_ID_CACHE_TIMEOUT = 86400

env = environ.Env(
    DEBUG=(bool, False)
)

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Replicate API settings
logger = logging.getLogger(__name__)
REPLICATE_API_TOKEN = env('REPLICATE_API_TOKEN')
logger.info(f"REPLICATE_API_TOKEN loaded: {'Yes' if REPLICATE_API_TOKEN else 'No'}")

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
