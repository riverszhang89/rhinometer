#include <rhinometer.h>

cson_value *websend(struct MHD_Connection *conn, char *error, size_t sz)
{
    cdb2_hndl_tp *hndl = NULL;
    const char *q, *row, *db, *host;
    char query[2048];
    int rc, i;

    cson_value *root, *arrv;
    cson_array *arr;
    cson_object *obj;

    root = NULL;

    db = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "database");
    if (db == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "database");
        return NULL;
    }

    host = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "host");
    if (host == NULL) {
        snprintf(error, sz, "Missing argument `%s'", "host");
        return NULL;
    }

    q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");
    if (q == NULL) {
        snprintf(error, sz, "Missing argument `%c'", 'q');
        return NULL;
    }

    rc = cdb2_open(&hndl, db, host, CDB2_DIRECT_CPU);
    if (rc != 0)
        return NULL;

    root = cson_value_new_object();
    obj = cson_value_get_object(root);
    cson_object_set(obj, "q", cson_value_new_string(q, strlen(q)));
    cson_object_set(obj, "database", cson_value_new_string(db, strlen(db)));
    cson_object_set(obj, "host", cson_value_new_string(db, strlen(host)));

    arrv = cson_value_new_array();
    cson_object_set(obj, "a", arrv);
    arr = cson_value_get_array(arrv);

    snprintf(query, sizeof(query), "exec procedure sys.cmd.send('%s')", q);
    rc = cdb2_run_statement(hndl, query);
    /* machine offline. continue. */
    if (rc != 0)
        goto out;

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        row = cdb2_column_value(hndl, 0);
        cson_array_set(arr, i, cson_value_new_string(row, strlen(row)));
    }

out:
    cdb2_close(hndl);
    if (rc != 0 && rc != CDB2_OK_DONE) {
        snprintf(error, sz, "%d: %s", rc, cdb2_errstr(hndl));
        cson_value_free(root);
        root = NULL;
    }
    return root;
}
