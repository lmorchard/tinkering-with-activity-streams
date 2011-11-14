function(doc) {
    if (doc.doc_type == 'Profile') {
        emit(doc.user_name, doc);
    }
}
