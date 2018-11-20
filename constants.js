/*
  All kinetic constants

  status: still not integrated to:
    "activated-sludge.js" TODO
    "nitrification.js" TODO
    "denitrification.js" TODO
*/

//Activated sludge
  const bH       = 0.24;  //1/d       | growth rate at 20ºC
  const theta_bH = 1.029; //unit?     | bH temperature correction factor
  const YH       = 0.45;  //gVSS/gCOD | yield (does not change with temperature)
  const fH       = 0.20;  //ø         | UPO OHO fraction
  const f_iOHO   = 0.15;  //g_iSS/gX  | fraction of inert solids in biomass

//Nitrification
  const µAm       = 0.45;  //1/d       | max growth rate at 20ºC
  const theta_µAm = 1.123; //unit?     | T  µA correction
  const K_O       = 0.0;   //mgDO/L    | DO µA sensitivity constant
  const theta_pH  = 2.35;  //page 471  | ph inhibition to µA
  const Ki        = 1.13;  //page 471  | ph inhibition to µA
  const Kii       = 0.3;   //page 471  | ph inhibition to µA
  const Kmax      = 9.5;   //page 471  | ph inhibition to µA
  const YA        = 0.1;   //gVSS/gFSA | yield
  const theta_YA  = 1;     //ø         | temperature correction factor
  const Kn        = 1.0;   //mg/L      | as N at 20ºC
  const theta_Kn  = 1.123; //          | Kn temperature correction factor
  const bA        = 0.04;  //1/d       | at 20ºC
  const theta_bA  = 1.029; //unit?     | bA temperature correction factor

//Denitrification
  const K1_20    = 0.72;  //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const K2_20    = 0.10;  //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const K3_20    = 0.10;  //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const K4_20    = 0.00;  //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const theta_K1 = 1.200; //ø                  | temperature correction factor for K1_20
  const theta_K2 = 1.080; //ø                  | temperature correction factor for K2_20
  const theta_K3 = 1.029; //ø                  | temperature correction factor for K3_20
  const theta_K4 = 1.029; //ø                  | temperature correction factor for K4_20
