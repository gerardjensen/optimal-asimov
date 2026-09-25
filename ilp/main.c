#include <stdio.h>
#include <glpk.h>
#include "solver.h"


int main()
{
  printf("\tc'Mx\tc'Ay\n");

  int goal[6] = {44188, 44191, 44192, 44193, 17332, 43139};
  int initial[1] = {51229};
  int unavailable[1] = {17682};

  buyer_t constraints = {
    .initial = initial,
    .initial_len = 1,
    .unavailable = unavailable,
    .unavailable_len = 1,
    .goal = goal,
    .goal_len = 6
  };

  init_solver();
  int N = -1;
  int z1;
  uint64_t sol_bitmap;
  do
  {
    int z = solve(N, &constraints, &z1, &sol_bitmap);
    if(z == -1) break;
    printf("%d\t%d: %lx\n", z1, z, sol_bitmap);
    N = z - 1;
    fflush(stdout);
  } while(z1 > 0);

  delete_solver();
}
