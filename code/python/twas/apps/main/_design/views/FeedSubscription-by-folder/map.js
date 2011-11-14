function(doc) {
    if (doc.doc_type == 'FeedSubscription') {
        for (var i=0,parent; parent=doc.parents[i]; i++) {
            emit(parent, doc);
        }
    }
}
