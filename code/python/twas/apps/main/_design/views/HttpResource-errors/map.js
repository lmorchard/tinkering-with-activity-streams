function(doc) {
    if (doc.doc_type == 'HttpResource' && doc.last_error) {
        emit(doc._id, [doc.url, doc.last_error]);
    }
}
