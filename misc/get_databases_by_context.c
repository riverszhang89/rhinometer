#include <rhinometer.h>

cson_value *get_databases_by_context(struct MHD_Connection *conn, char* error, size_t sz)
{
    const char *q, *row;
    cdb2_hndl_tp *hndl = NULL;
    int rc, i;
    char query[2048];

    int types[] = {CDB2_CSTRING};

    cson_value *root, *arrv;
    cson_object *obj;
    cson_array *arr;

    root = NULL;

    q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");
    if (q == NULL) {
        snprintf(error, sz, "Missing argument `%c'", 'q');
        return NULL;
    }

    rc = CDB2_OPEN(&hndl);
    if (rc != 0)
        return NULL;

    snprintf(query, sizeof(query),
             "SELECT DISTINCT(dbname) FROM contexts WHERE context LIKE '%s' AND "
             "(now() - start) <= CAST(14 AS DAY)",
             q);

    printf("query is %s\n", query);

    rc = cdb2_run_statement_typed(hndl, query, sizeof(types)/sizeof(types[0]), types);
    if (rc != 0)
        goto out;

    root = cson_value_new_object();
    obj = cson_value_get_object(root);

    arrv = cson_value_new_array();
    cson_object_set(obj, "a", arrv);
    arr = cson_value_get_array(arrv);

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        row = cdb2_column_value(hndl, 0);
        cson_array_set(arr, i, cson_value_new_string(row, strlen(row)));
    }

    snprintf(query, sizeof(query),
             "SELECT DISTINCT(context) FROM contexts WHERE context LIKE '%s' "
             "(now() - start) <= CAST(14 AS DAY)",
             q);

    printf("query is %s\n", query);

    rc = cdb2_run_statement_typed(hndl, query, sizeof(types)/sizeof(types[0]), types);
    if (rc != 0)
        goto out;

    arrv = cson_value_new_array();
    cson_object_set(obj, "q", arrv);
    arr = cson_value_get_array(arrv);

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        row = cdb2_column_value(hndl, 0);
        cson_array_set(arr, i, cson_value_new_string(row, strlen(row)));
    }

out:
    if (rc != 0 && rc != CDB2_OK_DONE) {
        snprintf(error, sz, "%d: %s", rc, cdb2_errstr(hndl));
        cson_value_free(root);
        root = NULL;
    }
    cdb2_close(hndl);
    return root;
}
