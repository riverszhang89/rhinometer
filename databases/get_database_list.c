#include <rhinometer.h>

cson_value *get_database_list(struct MHD_Connection *conn, char *error, size_t sz)
{
    cdb2_hndl_tp *hndl = NULL;
    const char *q, *row;
    int rc, i, j;
    char *last, *tok, *qdup;

    cson_value *root, *arrv, *db;
    cson_object *obj;
    cson_array *dbarr;

    root = NULL;

    q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");
    if (q == NULL) {
        snprintf(error, sz, "Missing argument `%c'", 'q');
        return NULL;
    }

    root = cson_value_new_object();
    obj = cson_value_get_object(root);

    cson_object_set(obj, "q", cson_value_new_string(q, strlen(q)));
    arrv = cson_value_new_array();
    cson_object_set(obj, "a", arrv);
    dbarr = cson_value_get_array(arrv);

    /* MHD_lookup_connection_value() returns a const char *.
       Make a dup for strtok(). */
    qdup = strdup(q);
    last = tok = NULL;
    tok = strtok_r(qdup, ",", &last);
    for (rc = 0, i = 0; tok != NULL; ++i) {
        db = cson_value_new_object();
        obj = cson_value_get_object(db);
        cson_object_set(obj, "database", cson_value_new_string(tok, strlen(tok)));
        cson_array_set(dbarr, i, db);

        rc = CDB2_OPEN_DB(&hndl, tok);

        /* db is offline. continue. */
        if (rc != 0)
            goto next;

        rc = cdb2_run_statement(hndl, "SELECT comdb2_version()");

        /* db is offline. continue. */
        if (rc != 0)
            goto next;

        for (j = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++j) {
            row = cdb2_column_value(hndl, 0);
            cson_object_set(obj, "version", cson_value_new_string(row, strlen(row)));
        }

next:
        rc = 0;
        tok = strtok_r(NULL, ",", &last);
        cdb2_close(hndl);
        hndl = NULL;
    }

    free(qdup);
    cdb2_close(hndl);
    if (rc != 0 && rc != CDB2_OK_DONE) {
        snprintf(error, sz, "%d: %s", rc, cdb2_errstr(hndl));
        cson_value_free(root);
        root = NULL;
    }
    return root;
}
