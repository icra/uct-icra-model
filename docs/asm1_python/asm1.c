/*
 * ASM1 is a C-file S-function for IAWQ AS Model No 1.  
 *
 * Copyright: Ulf Jeppsson, IEA, Lund University, Lund, Sweden
 */

#define S_FUNCTION_NAME asm1

#include "simstruc.h"
#include <math.h>

#define XINIT   ssGetArg(S,0)
#define PAR	ssGetArg(S,1)
#define V	ssGetArg(S,2)
#define SOSAT	ssGetArg(S,3)

/*
 * mdlInitializeSizes - initialize the sizes array
 */
static void mdlInitializeSizes(SimStruct *S) {
  ssSetNumContStates(    S, 13); /*13 number of continuous states           */
  ssSetNumDiscStates(    S, 0);   /* number of discrete states             */
  ssSetNumInputs(        S, 16);   /* number of inputs                      */
  ssSetNumOutputs(       S, 15);   /* number of outputs                     */
  ssSetDirectFeedThrough(S, 1);   /* direct feedthrough flag               */
  ssSetNumSampleTimes(   S, 1);   /* number of sample times                */
  ssSetNumSFcnParams(    S, 4);   /* number of input arguments             */
  ssSetNumRWork(         S, 0);   /* number of real work vector elements   */
  ssSetNumIWork(         S, 0);   /* number of integer work vector elements*/
  ssSetNumPWork(         S, 0);   /* number of pointer work vector elements*/
}

/*
 * mdlInitializeSampleTimes - initialize the sample times array
 */
static void mdlInitializeSampleTimes(SimStruct *S) {
  ssSetSampleTime(S, 0, CONTINUOUS_SAMPLE_TIME);
  ssSetOffsetTime(S, 0, 0.0);
}


/*
 * mdlInitializeConditions - initialize the states
 */
static void mdlInitializeConditions(double *x0, SimStruct *S) {
  int i;

  for (i = 0; i < 13; i++) { x0[i] = mxGetPr(XINIT)[i]; }
}

/*
 * mdlOutputs - compute the outputs
 */
static void mdlOutputs(double *y, double *x, double *u, SimStruct *S, int tid) {
  double X_I2TSS, X_S2TSS, X_BH2TSS, X_BA2TSS, X_P2TSS;
  int i;

  X_I2TSS = mxGetPr(PAR)[19];
  X_S2TSS = mxGetPr(PAR)[20];
  X_BH2TSS = mxGetPr(PAR)[21];
  X_BA2TSS = mxGetPr(PAR)[22];
  X_P2TSS = mxGetPr(PAR)[23];

  for (i = 0; i < 13; i++) {
    y[i] = x[i];
  }

  y[13]=X_I2TSS*x[2]+X_S2TSS*x[3]+X_BH2TSS*x[4]+X_BA2TSS*x[5]+X_P2TSS*x[6];
  y[14]=u[14];  /* x[13] */

}

/*
 * mdlUpdate - perform action at major integration time step
 */

static void mdlUpdate(double *x, double *u, SimStruct *S, int tid) {
}

/*
 * mdlDerivatives - compute the derivatives
 */
static void mdlDerivatives(double *dx, double *x, double *u, SimStruct *S, int tid) {

  double mu_H, K_S, K_OH, K_NO, b_H, mu_A, K_NH, K_OA, b_A, ny_g, k_a, k_h, K_X, ny_h;
  double Y_H, Y_A, f_P, i_XB, i_XP;
  double proc1, proc2, proc3, proc4, proc5, proc6, proc7, proc8, proc3x;
  double reac1, reac2, reac3, reac4, reac5, reac6, reac7, reac8, reac9, reac10, reac11, reac12, reac13;
  double vol, SO_sat, T;
  double xtemp[13];
  int i;

  mu_H = mxGetPr(PAR)[0];
  K_S = mxGetPr(PAR)[1];
  K_OH = mxGetPr(PAR)[2];
  K_NO = mxGetPr(PAR)[3];
  b_H = mxGetPr(PAR)[4];
  mu_A = mxGetPr(PAR)[5];
  K_NH = mxGetPr(PAR)[6];
  K_OA = mxGetPr(PAR)[7];
  b_A = mxGetPr(PAR)[8];
  ny_g = mxGetPr(PAR)[9];
  k_a = mxGetPr(PAR)[10];
  k_h = mxGetPr(PAR)[11];
  K_X = mxGetPr(PAR)[12];
  ny_h = mxGetPr(PAR)[13];
  Y_H = mxGetPr(PAR)[14];
  Y_A = mxGetPr(PAR)[15];
  f_P = mxGetPr(PAR)[16];
  i_XB = mxGetPr(PAR)[17];
  i_XP = mxGetPr(PAR)[18];
  vol = mxGetPr(V)[0];
  SO_sat = mxGetPr(SOSAT)[0];

  for (i = 0; i < 13; i++) {
    if (x[i] < 0.0)
      xtemp[i] = 0.0;
    else
      xtemp[i] = x[i];
  }

  if (u[15] < 0.0) x[7] = fabs(u[15]);

  proc1 = mu_H*(xtemp[1]/(K_S+xtemp[1]))*(xtemp[7]/(K_OH+xtemp[7]))*xtemp[4];
  proc2 = mu_H*(xtemp[1]/(K_S+xtemp[1]))*(K_OH/(K_OH+xtemp[7]))*(xtemp[8]/(K_NO+xtemp[8]))*ny_g*xtemp[4];
  proc3 = mu_A*(xtemp[9]/(K_NH+xtemp[9]))*(xtemp[7]/(K_OA+xtemp[7]))*xtemp[5];
  /* in GPS-X they use proc3x instead of proc3 in the oxygen equation */
  /* proc3x = mu_A*(xtemp[9]/(K_NH+xtemp[9]))*(xtemp[7]/(K_OH+xtemp[7]))*xtemp[5]; */
  proc4 = b_H*xtemp[4];
  proc5 = b_A*xtemp[5];
  proc6 = k_a*xtemp[10]*xtemp[4];
  proc7 = k_h*((xtemp[3]/xtemp[4])/(K_X+(xtemp[3]/xtemp[4])))*((xtemp[7]/(K_OH+xtemp[7]))+ny_h*(K_OH/(K_OH+xtemp[7]))*(xtemp[8]/(K_NO+xtemp[8])))*xtemp[4];
  proc8 = proc7*xtemp[11]/xtemp[3];

  reac1 = 0.0;
  reac2 = (-proc1-proc2)/Y_H+proc7;
  reac3 = 0.0;
  reac4 = (1.0-f_P)*(proc4+proc5)-proc7;
  reac5 = proc1+proc2-proc4;
  reac6 = proc3-proc5;
  reac7 = f_P*(proc4+proc5);
  reac8 = -((1.0-Y_H)/Y_H)*proc1-((4.57-Y_A)/Y_A)*proc3;
  reac9 = -((1.0-Y_H)/(2.86*Y_H))*proc2+proc3/Y_A;
  reac10 = -i_XB*(proc1+proc2)-(i_XB+(1.0/Y_A))*proc3+proc6;
  reac11 = -proc6+proc8;
  reac12 = (i_XB-f_P*i_XP)*(proc4+proc5)-proc8;
  reac13 = -i_XB/14*proc1+((1.0-Y_H)/(14.0*2.86*Y_H)-(i_XB/14.0))*proc2-((i_XB/14.0)+1.0/(7.0*Y_A))*proc3+proc6/14;

  dx[0] = 1.0/vol*(u[14]*(u[0]-x[0]))+reac1;
  dx[1] = 1.0/vol*(u[14]*(u[1]-x[1]))+reac2;
  dx[2] = 1.0/vol*(u[14]*(u[2]-x[2]))+reac3;
  dx[3] = 1.0/vol*(u[14]*(u[3]-x[3]))+reac4;
  dx[4] = 1.0/vol*(u[14]*(u[4]-x[4]))+reac5;
  dx[5] = 1.0/vol*(u[14]*(u[5]-x[5]))+reac6;
  dx[6] = 1.0/vol*(u[14]*(u[6]-x[6]))+reac7;
  if (u[15] < 0.0)
    dx[7] = 0.0;
  else
    dx[7] = 1.0/vol*(u[14]*(u[7]-x[7]))+reac8+u[15]*(SO_sat-x[7]);
  dx[8] = 1.0/vol*(u[14]*(u[8]-x[8]))+reac9;
  dx[9] = 1.0/vol*(u[14]*(u[9]-x[9]))+reac10;
  dx[10] = 1.0/vol*(u[14]*(u[10]-x[10]))+reac11;
  dx[11] = 1.0/vol*(u[14]*(u[11]-x[11]))+reac12;
  dx[12] = 1.0/vol*(u[14]*(u[12]-x[12]))+reac13;
  /*dx[13] = (u[14]-x[13])/T;   low pass filter for flow, avoid algebraic loops */

}


/*
 * mdlTerminate - called when the simulation is terminated.
 */
static void mdlTerminate(SimStruct *S) {
}

#ifdef	MATLAB_MEX_FILE    /* Is this file being compiled as a MEX-file? */
#include "simulink.c"      /* MEX-file interface mechanism */
#else
#include "cg_sfun.h"       /* Code generation registration function */
#endif
