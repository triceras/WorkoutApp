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
        ('api', '0012_alter_user_email_alter_user_first_name_and_more'),
    ]

    operations = [
        migrations.RunPython(handle_empty_emails),
    ]
