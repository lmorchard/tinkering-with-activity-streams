from optparse import make_option

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from twas.utils import opml

from main.models import FeedSubscription

class Command(BaseCommand):
    help = 'Import OPML subscriptions'
    args = 'filename'
    #option_list = ...
    can_import_settings = True

    def handle(self, *arg, **kwargs):
        if len(arg) < 1:
            raise CommandError('OPML filename required')

        with open(arg[0]) as fin:
            entries = opml.get_subscriptions(fin)
            for entry in entries:
                print "Importing %s" % entry['title']
                sub = FeedSubscription.get_or_create('%s:%s' %
                        ('FeedSubscription', entry['xmlurl']))
                if entry['type'] in ('rss', 'atom'):
                    sub.feed_type = 'rss'
                sub.url = entry['xmlurl']
                sub.link = entry['url']
                sub.title = entry['title']
                sub.parents = [x['title'] for x in entry['parents']]
                sub.save()
