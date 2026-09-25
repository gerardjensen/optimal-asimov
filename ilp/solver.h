#ifndef SOLVER_H
#define SOLVER_H

#include "cJSON.h"
#include <stdint.h>

typedef struct solver_s {
  int m;
  int n; 
  cJSON* collections;
  cJSON* titles;
} solver_t ;

typedef struct buyer_s {
  int* initial;
  int initial_len;
  int* goal;
  int goal_len;
  int* unavailable;
  int unavailable_len;
} buyer_t;


int solve(int N, buyer_t* constraints, int* z1, uint64_t* sol_bitmap);

void init_solver();
void delete_solver();

#endif
