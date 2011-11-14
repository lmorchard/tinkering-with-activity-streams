function(doc) {
    if (doc.doc_type == 'FeedSubscription') {
        emit(doc._id, doc);
    }
}
