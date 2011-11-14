function (keys, values, rereduce) {
    var s = {};
    if (rereduce) {
        for (var i in values) {
            var sub_s = values[i];
            for (var k in sub_s) {
                if (k in s) {
                    s[k] += sub_s[k];
                } else {
                    s[k] = sub_s[k];
                }
            }
        }
    } else {
        for (var i in values) {
            var sc = values[i];
            if (sc in s) {
                s[sc]++;
            } else {
                s[sc] = 1;
            }
        }
    }
    return s;
}
