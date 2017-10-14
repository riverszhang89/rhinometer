#include <rhinometer.h>

cson_value *get_database_details(struct MHD_Connection *conn, char *error, size_t sz)
{
    cdb2_hndl_tp *hndl = NULL;
    const char *q, *row;
    int rc, i, j, ii;

    cson_value *root, *arrv, *node;
    cson_array *arr, *subarr;
    cson_object *obj;

    root = NULL;

    q = MHD_lookup_connection_value(conn, MHD_GET_ARGUMENT_KIND, "q");
    if (q == NULL) {
        snprintf(error, sz, "Missing argument `%c'", 'q');
        return NULL;
    }

    rc = CDB2_OPEN_DB(&hndl, q);
    if (rc != 0)
        return NULL;

    root = cson_value_new_object();
    obj = cson_value_get_object(root);
    cson_object_set(obj, "q", cson_value_new_string(q, strlen(q)));

    arrv = cson_value_new_array();
    cson_object_set(obj, "a", arrv);
    arr = cson_value_get_array(arrv);

    /* Get cluster info. */
    rc = cdb2_run_statement(hndl, "EXEC PROCEDURE sys.info.cluster()");

    if (rc != 0)
        goto out;

    for (i = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++i) {
        node = cson_value_new_object();
        obj = cson_value_get_object(node);

        for (j = 0; j != cdb2_numcolumns(hndl); ++j) {
            if (strcasecmp(cdb2_column_name(hndl, j), "host") == 0) {
                row = cdb2_column_value(hndl, j);
                cson_object_set(obj, "host", cson_value_new_string(row, strlen(row)));
            } else if (strcasecmp(cdb2_column_name(hndl, j), "master") == 0) {
                cson_object_set(obj, "master", cson_value_new_integer(*(long long *)cdb2_column_value(hndl, j)));
            }
        }
        cson_array_set(arr, i, node);
    }

    cdb2_close(hndl);

    for (j = 0; j != i; ++j) {
        node = cson_array_get(arr, j);
        obj = cson_value_get_object(node);

        rc = cdb2_open(&hndl, q, cson_value_get_cstr(cson_object_get(obj, "host")), CDB2_DIRECT_CPU);
        /* machine offline. continue. */
        if (rc != 0)
            goto next;

        arrv = cson_value_new_array();
        cson_object_set(obj, "stat", arrv);
        subarr = cson_value_get_array(arrv);

        rc = cdb2_run_statement(hndl, "exec procedure sys.cmd.send('stat')");
        /* machine offline. continue. */
        if (rc != 0)
            goto next;

        for (ii = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ++ii) {
            row = cdb2_column_value(hndl, 0);
            cson_array_set(subarr, ii, cson_value_new_string(row, strlen(row)));
        }

        rc = cdb2_run_statement(hndl, "exec procedure sys.cmd.send('memstat group_by_name')");
        /* machine offline. continue. */
        if (rc != 0)
            goto next;

        arrv = cson_value_new_array();
        cson_object_set(obj, "memstat", arrv);
        subarr = cson_value_get_array(arrv);

        for (ii = 0; (rc = cdb2_next_record(hndl)) == CDB2_OK; ) {
            row = cdb2_column_value(hndl, 0);
            if (strncmp(row, "------", 6) != 0) {
              cson_array_set(subarr, ii, cson_value_new_string(row, strlen(row)));
              ++ii;
            }
        }
next:
        rc = 0;
        cdb2_close(hndl);
        hndl = NULL;
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
