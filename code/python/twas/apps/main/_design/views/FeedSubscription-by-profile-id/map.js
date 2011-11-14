function(doc) {
    if (doc.doc_type == 'FeedSubscription') {
        emit(doc.profile_id, doc);
    }
}
