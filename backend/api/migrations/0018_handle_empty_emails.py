
    
from django.db import migrations
from django.contrib.auth import get_user_model

def handle_empty_emails(apps, schema_editor):
    User = apps.get_model('api', 'User')
    users_with_empty_email = User.objects.filter(email='')
    for index, user in enumerate(users_with_empty_email):
        user.email = f'user{index}@example.com'
        user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_merge_0013_alter_user_email_0016_handle_empty_emails'),  # Replace with the actual previous migration
    ]

    operations = [
        migrations.RunPython(handle_empty_emails),
    ]
