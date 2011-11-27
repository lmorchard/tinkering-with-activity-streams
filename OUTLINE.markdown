# Tinkering with Activity Streams

* Preface
* Part I:
    * What are Activity Streams?
    * Gathering Tools for Tinkering
        * node.js
        * Python
        * CouchDB
        * RabbitMQ
        * Celery
        * Vagrant & Puppet?

* Creating
* Publishing
    * Republishing
* Consuming
    * Polling
    * PubSub
* Converting
    * Normalizing
* Coalescing
* Following
* Identity
* Responding
* Remixing

## Inbox

* The Lifestreams data model seems a lot like CouchDB
    * Substreams & agents = a lot like map functions
    * Summarize = a lot like reduce function
    

* Hacks
    * convert RSS/Atom feed to AS-JSON
        * fill in missing fields with inferences and user-supplied metadata
    * CouchApp to post to an AS?
    * S3 app to post to an AS?
        * status notes
        * checkins - geolocation
        * shared items - bookmarklet?
    * Adaptors for other sites
        * from facebook
        * from twitter
        * from google+
    * webfinger seems handy
    * How do replies work?
        * salmon?
        * ostatus?
