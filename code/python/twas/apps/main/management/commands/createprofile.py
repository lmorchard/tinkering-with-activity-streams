from optparse import make_option

import json
import requests

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from main.models import Profile, HttpResource, FeedSubscription

class Command(BaseCommand):
    help = 'Create new profile'
    option_list = BaseCommand.option_list + (
        make_option('-u', '--user',
            action='store', dest='user_name',
            help='User name'),
        make_option('-e', '--email',
            action='store', dest='email',
            help='Email address'),
        make_option('-d', '--display',
            action='store', dest='display_name',
            help='Display name'),
        make_option('-b', '--bio',
            action='store', dest='bio',
            help='Bio'),
        make_option('-l', '--location',
            action='store', dest='location', 
            help='Location'),
    )
    can_import_settings = True

    def handle(self, *arg, **kwargs):
        p_id = Profile.new_id(kwargs['user_name'])
        p = Profile.get_or_create(p_id)
        for k in ('user_name', 'email', 'display_name', 
                  'bio', 'location'):
            setattr(p, k, kwargs[k])
        p.save()
