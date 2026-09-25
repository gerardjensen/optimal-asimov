#include <limits.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <glpk.h>
#include "solver.h"
#include "cJSON.h"

const char* COLLECTIONS = "src/pubs.json";
const char* TITLES = "src/titles.json";

static solver_t solver;

cJSON* load_from_file(const char* path)
{
  char * buffer = 0;
  long length;
  FILE * f = fopen (path, "r");

  if (!f) return NULL;

  fseek (f, 0, SEEK_END);
  length = ftell (f);
  fseek (f, 0, SEEK_SET);
  buffer = malloc(length + 1);
  if (!buffer)
  {
    fclose (f);
    return NULL;
  }


  fread (buffer, 1, length, f);
  fclose (f);
  buffer[length] = '\0';

  cJSON* result = cJSON_Parse(buffer);
  free(buffer);
  return result;
}

glp_prob* create_prob(int m, int n, int N, cJSON* collections, cJSON* titles, int cx)
{
  if(N == -1) N = INT_MAX;

  int is_prob1 = cx == -1;
  glp_prob* P = glp_create_prob();
  glp_set_prob_name(P, is_prob1 ? "P1 (max)" : "P2 (min)");
  glp_set_obj_dir(P, is_prob1 ? GLP_MAX : GLP_MIN);
  glp_add_cols(P, n+m);
  glp_add_rows(P, n + 1);

  char name[250];

  for(int i = 1; i<= n + m; i++)
  {
    int id;
    char* item_name;
    if(i <= n)
    {
      cJSON* title = cJSON_GetArrayItem(titles, i-1);
      id = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(title, "isfdb_id"));
      item_name = cJSON_GetStringValue(cJSON_GetObjectItem(title, "title"));
    } else 
    {
      
      cJSON* collection = cJSON_GetArrayItem(collections, i - 1 - n);
      id = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(collection, "pub_id"));
      item_name = cJSON_GetStringValue(cJSON_GetObjectItem(collection, "name"));
    }

    // sprintf(name, "%c[%i]: %d", i <= n ? 'x' : 'y', i <= n ? i : i - n, id);
    // glp_set_col_name(P, i, name);
    glp_set_col_name(P, i, item_name);
    glp_set_col_kind(P,i,GLP_BV);
  }

  for(int i = 1; i<= n; i++)
  {
    sprintf(name, "v[%i]", i);
    glp_set_row_name(P, i, name);
    glp_set_row_bnds(P, i, GLP_LO, 0.0, 0.0);
  }
  sprintf(name, "v[%i]", n+1);
  if(is_prob1)
    glp_set_row_bnds(P, n+1, GLP_UP, 0.0, N);
  else
    glp_set_row_bnds(P, n+1, GLP_FX, cx, 0.0);

  glp_set_row_name(P, n+1, name);

  return P;
}

int get_array_index(int* arr, int len, int value)
{
  for (int i = 0; i<len; i++)
    if(arr[i] == value) return i;
  return -1;
}

void fill_coefs(glp_prob* P, int m, int n, cJSON* collections, cJSON* titles, int is_prob1, buyer_t* constraints)
{
  int* sf_ids = (int *) malloc(n * sizeof(int));
  int* pubs_ids = (int *) malloc(m * sizeof(int));
  int* sf_pages = (int *) malloc(n * sizeof(int));

  int* ia = (int*) calloc((n+m) * (n + 1) + 1, sizeof(int));
  int* ja = (int*) calloc((n+m) * (n + 1) + 1, sizeof(int));
  double* ar = (double*) calloc((n+m) * (n + 1) + 1, sizeof(double));
  int ptr = 1;

  for(int i = 0; i<n + m; i++)
  {
    if(i < n)
    {
      cJSON* title = cJSON_GetArrayItem(titles, i);
      sf_ids[i] = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(title, "isfdb_id"));
      sf_pages[i] = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(title, "pages")); 
     
      int masked_num_pages = get_array_index(constraints->goal, constraints->goal_len, sf_ids[i]) != -1 ? sf_pages[i] : 0;

      if(is_prob1)
      {
        glp_set_obj_coef(P, i + 1, masked_num_pages);
      }
      else 
      {
        glp_set_obj_coef(P, i + 1, 0.0);

        ia[ptr] = n + 1;
        ja[ptr] = i + 1;
        ar[ptr] = masked_num_pages; 
        ptr++; 
      }
    }
    else
    {
      cJSON* pub = cJSON_GetArrayItem(collections, i - n);
      pubs_ids[i - n] = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(pub, "pub_id"));
      glp_set_obj_coef(P, i + 1, 0.0);
    }
  }
 
  for(int i = 0; i<m; i++)
  {
    cJSON* collection = cJSON_GetArrayItem(collections, i);
    int pub_id = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(collection, "pub_id"));
    cJSON* pb_titles = cJSON_GetObjectItem(collection, "titles");
    int num_titles = cJSON_GetArraySize(pb_titles);
    int col_sum_pages = 0;

    for(int j = 0; j<num_titles; j++)
    {
      int t_id = (int) cJSON_GetNumberValue(cJSON_GetArrayItem(pb_titles, j));
      int t_index = get_array_index(sf_ids, n, t_id);
      col_sum_pages += sf_pages[t_index];
      
      ia[ptr] = t_index + 1;
      ja[ptr] = n + i + 1;
      ar[ptr] = 1;
      ptr++;
    }
    if(is_prob1)
    {
      ia[ptr] = n + 1;
      ja[ptr] = n + i + 1;
      ar[ptr] = col_sum_pages; 
      ptr++;
    }
    else
      glp_set_obj_coef(P, i + 1 + n, col_sum_pages);
  }

  for(int j = 0; j<constraints->initial_len; j++)
  {
    int index = get_array_index(pubs_ids, m, constraints->initial[j]);
    if(index == -1) continue;
    glp_set_col_bnds(P, 1 + n + index, GLP_FX, 1, 1);
  }


  for(int j = 0; j<constraints->unavailable_len; j++)
  {
    int index = get_array_index(pubs_ids, m, constraints->unavailable[j]);
    if(index == -1) continue;
    glp_set_col_bnds(P, 1 + n + index, GLP_FX, 0, 0);
  }

  for(int i = 0; i<n; i++)
  {
      ia[ptr] = i + 1;
      ja[ptr] = i + 1;
      ar[ptr] = -1;
      ptr++;
  }

  glp_load_matrix(P, ptr-1, ia, ja, ar);
  free(ia);
  free(ja);
  free(ar);
  free(sf_ids);
  free(pubs_ids);
  free(sf_pages);
}


int cx(int m, int n, cJSON* collections, cJSON* titles, glp_prob* P)
{
  int _cx = 0;
  for(int j = 1; j<= n; j++)
  {
    int xj = (int)glp_mip_col_val(P, j);
    cJSON* title = cJSON_GetArrayItem(titles, j-1);
    int cj = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(title, "pages")); 
    _cx += cj * xj;
  }
  return _cx;
}

int cAy(int m, int n, cJSON* collections, cJSON* titles, glp_prob* P)
{
  int _cAy = 0;

  int* sf_ids = (int *) malloc(n * sizeof(int));
  int* sf_pages = (int *) malloc(n * sizeof(int));


  for(int i = 0; i<n; i++)
  {
      cJSON* title = cJSON_GetArrayItem(titles, i);
      sf_ids[i] = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(title, "isfdb_id"));
      sf_pages[i] = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(title, "pages")); 
  }
  
  for(int i = 0; i<m; i++)
  {
    cJSON* collection = cJSON_GetArrayItem(collections, i);
    int pub_id = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(collection, "pub_id"));
    cJSON* pb_titles = cJSON_GetObjectItem(collection, "titles");
    int num_titles = cJSON_GetArraySize(pb_titles);
    int col_sum_pages = 0;

    for(int j = 0; j<num_titles; j++)
    {
      int t_id = (int) cJSON_GetNumberValue(cJSON_GetArrayItem(pb_titles, j));
      int t_index = get_array_index(sf_ids, n, t_id);
      col_sum_pages += sf_pages[t_index];
    }
    int yi = (int)glp_mip_col_val(P, i+n+1);
    _cAy += yi * col_sum_pages;
  }

  free(sf_ids);
  free(sf_pages);

  return _cAy;
}


int holds_prop(int m, int n, cJSON* collections, cJSON* titles, glp_prob* P)
{

  int* sf_ids = (int *) malloc(n * sizeof(int));
  int* expected_x = (int *) calloc(n, sizeof(int));


  for(int i = 0; i<n; i++)
  {
      cJSON* title = cJSON_GetArrayItem(titles, i);
      sf_ids[i] = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(title, "isfdb_id"));
  }
  
  for(int i = 0; i<m; i++)
  {
    cJSON* collection = cJSON_GetArrayItem(collections, i);
    int pub_id = (int) cJSON_GetNumberValue(cJSON_GetObjectItem(collection, "pub_id"));
    cJSON* pb_titles = cJSON_GetObjectItem(collection, "titles");
    int num_titles = cJSON_GetArraySize(pb_titles);

    int present = (int)glp_mip_col_val(P, n + 1 + i);
    if(present)
      for(int j = 0; j<num_titles; j++)
      {
        int t_id = (int) cJSON_GetNumberValue(cJSON_GetArrayItem(pb_titles, j));
        int t_index = get_array_index(sf_ids, n, t_id);
        expected_x[t_index] = 1;
      }
  }

  int ret = 1;

  for(int i = 1; i<=n ; i++)
  {
    int title_present = (int)round(glp_mip_col_val(P, i));
    if(title_present != expected_x[i - 1])
    {
      printf("X MISMATCH on title %03d. Expected %d got %d\n", i, expected_x[i-1], title_present);
      ret = 0;
    }
  }
  
  free(sf_ids);
  free(expected_x);

  return ret;
}

int get_z(int N, int m, int n, cJSON* collections, cJSON* titles, buyer_t* constraints)
{
  
  glp_prob* P1 = create_prob(m,n, N, collections, titles, -1);
  fill_coefs(P1, m, n, collections, titles, 1, constraints);

  glp_iocp iocp;
  glp_simplex(P1, NULL);

  glp_init_iocp(&iocp);
  iocp.br_tech = GLP_BR_MFV; /* most fractional variable */
  iocp.bt_tech = GLP_BT_BLB; /* best local bound */
  iocp.sr_heur = GLP_OFF; /* disable simple rounding heuristic */
  iocp.gmi_cuts = GLP_ON; /* enable Gomory cuts */
  glp_intopt(P1, &iocp);

  int z = glp_mip_status(P1) == GLP_OPT ? (int)round(glp_mip_obj_val(P1)) : -1;

  glp_delete_prob(P1);

  return z;
}

int solve_helper(int N, int m, int n, cJSON* collections, cJSON* titles, buyer_t* constraints, int* z1, uint64_t* sol_bitmap)
{
  *sol_bitmap = 0;
  int _cx = get_z(N,m,n,collections,titles, constraints);
  *z1 = _cx;
  if(_cx == -1) 
    return -1;
  
  glp_prob* P2 = create_prob(m,n, N, collections, titles, _cx);
  fill_coefs(P2, m, n, collections, titles, 0, constraints);

  glp_iocp iocp;
  glp_simplex(P2, NULL);

  glp_init_iocp(&iocp);
  iocp.br_tech = GLP_BR_MFV; /* most fractional variable */
  iocp.bt_tech = GLP_BT_BLB; /* best local bound */
  iocp.sr_heur = GLP_OFF; /* disable simple rounding heuristic */
  iocp.gmi_cuts = GLP_ON; /* enable Gomory cuts */
  glp_intopt(P2, &iocp);

  for(int j = n + 1; j<= n + m; j++)
  {
    int present = (int)glp_mip_col_val(P2, j);
    *sol_bitmap = (*sol_bitmap << 1) | (present & 0x1);
  }

  int z = (int) round(glp_mip_obj_val(P2));

  glp_delete_prob(P2);

  return z;
}


int solve(int N, buyer_t* constraints, int* z1, uint64_t* sol_bitmap)
{
  return solve_helper(N,  solver.m, solver.n, solver.collections, solver.titles, constraints, z1, sol_bitmap);
}

void init_solver()
{ 
  glp_term_out(GLP_OFF);
  solver.collections = load_from_file(COLLECTIONS);
  solver.titles = load_from_file(TITLES);
  solver.m = cJSON_GetArraySize(solver.collections);
  solver.n = cJSON_GetArraySize(solver.titles);
  printf("Titles: %d\n", solver.n);
  printf("Collections: %d\n", solver.m);
}

void delete_solver()
{
  cJSON_free(solver.collections);
  cJSON_free(solver.titles); 
}
