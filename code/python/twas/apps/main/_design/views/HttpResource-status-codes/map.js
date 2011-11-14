function(doc) {
    if ('HttpResource' == doc.doc_type) { 
        emit(doc._id, doc.status);
    }
}
