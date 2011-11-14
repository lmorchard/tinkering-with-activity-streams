function(doc) {
    if ('FeedSubscription' == doc.doc_type) { 
        emit(doc.last_fetch_time || 0, doc);
    }
}
