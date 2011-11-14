import sys
import os
import base64
import time

from optparse import make_option

import requests

from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from manage import path

from twas.utils import opml

from main.models import Profile, FeedSubscription, HttpResource

class Command(BaseCommand):
    help = 'Create a new profile'
    can_import_settings = True

    def handle(self, *arg, **kwargs):
        pass
