from optparse import make_option

import json
import requests

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from main.models import FeedSubscription

class Command(BaseCommand):
    help = 'Create new subscription'
    option_list = BaseCommand.option_list + (
        make_option('-y', '--type',
            action='store', dest='type', help='Type'),
        make_option('-t', '--title',
            action='store', dest='title', help='Title'),
        make_option('-u', '--url',
            action='store', dest='url', help='URL'),
        make_option('-l', '--link',
            action='store', dest='link', help='Link'),
    )
    can_import_settings = True

    def handle(self, *arg, **kwargs):

        sub = FeedSubscription.get_or_create('%s:%s' %
                ('FeedSubscription', kwargs['url']))
        sub.feed_type = kwargs['type']
        sub.url = kwargs['url']
        sub.link = kwargs['link']
        sub.title = kwargs['title']
        sub.save()
