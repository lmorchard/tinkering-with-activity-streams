function(doc) {
    if (doc.doc_type == 'HttpResource') {
        emit(doc._id, doc);
    }
}
