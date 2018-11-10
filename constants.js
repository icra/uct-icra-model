/*
  Kinetic constants
  STATUS: TODO
    still not integrated to 
    "activated-sludge.js" and "nitrification.js"
*/

//Activated sludge
  const bH       = 0.24;  //1/d       | growth rate at 20ºC (standard)
  const theta_bH = 1.029; //unit?     | bH correction factor
  const YH     = 0.45;    //gVSS/gCOD | name?
  const fH     = 0.20;    //unit?     | tabled value
  const f_iOHO = 0.15;    //g_iSS/gX  | fraction of inert solids in biomass

//Nitrification
  const µAm       = 0.45;  //1/d   | growth rate at 20ºC
  const theta_µAm = 1.123; //unit? | µAm correction factor
  const Kn        = 1.0;   //mg/L as N at 20ºC
  const theta_Kn  = 1.123; //unit? | Kn correction factor
  const bA        = 0.04;  //1/d at 20ºC
  const theta_bA  = 1.029; //unit? | bA correction factor
