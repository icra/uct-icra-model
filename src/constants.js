/*
  All kinetic constants.
  The user can modify these numbers in the GUI.

  This object is used in the following files:
    "activated-sludge.js"
    "nitrification.js"
    "denitrification.js"
*/

let constants={
  //activated sludge
  YH         : 0.450, //gVSS/gCOD | heterotrophic yield (not affected by temperature)
  bH         : 0.240, //1/d       | heterotrophic endogenous respiration rate at 20ºC
  theta_bH   : 1.029, //ø         | bH temperature correction factor
  k_v20      : 0.070, //L/mgVSS·d | constant for not degraded bCOD (FBSO)
  theta_k_v20: 1.035, //ø         | k_v20 temperature correction factor
  fH         : 0.200, //ø         | heterotrophic endogenous residue fraction
  f_iOHO     : 0.150, //giSS/gVSS | iSS content of OHOs
  //nitrification
  µAm      : 0.450, //1/d       | autotrophic max specific growth rate at 20ºC
  theta_µAm: 1.123, //ø         | µAm temperature correction factor
  K_O      : 0.400, //mgDO/L    | autotrophic DO µA sensitivity constant
  theta_pH : 2.350, //ø         | autotrophic ph sensitivity coefficient
  Ki       : 1.130, //ø         | autotrophic ph inhibition to µA
  Kii      : 0.300, //ø         | autotrophic ph inhibition to µA
  Kmax     : 9.500, //ø         | autotrophic ph inhibition to µA
  YA       : 0.100, //gVSS/gFSA | autotrophic yield
  Kn       : 1.000, //mgN/L     | ammonia half saturation coefficient at 20ºC
  theta_Kn : 1.123, //ø         | Kn temperature correction factor
  bA       : 0.040, //1/d       | autotrophic endogenous respiration rate at 20ºC
  theta_bA : 1.029, //ø         | bA temperature correction factor
  //denitrification
  K1_20   : 0.720, //gN/gVSS·d | at 20ºC page 482 and 113
  K2_20   : 0.101, //gN/gVSS·d | at 20ºC page 482 and 113
  //K3_20   : 0.072, //gN/gVSS·d | at 20ºC page 482 and 113
  //K4_20   : 0.048, //gN/gVSS·d | at 20ºC page 482 and 113
  theta_K1: 1.200, //ø         | temperature correction factor for K1_20
  theta_K2: 1.080, //ø         | temperature correction factor for K2_20
  //theta_K3: 1.029, //ø         | temperature correction factor for K3_20
  //theta_K4: 1.029, //ø         | temperature correction factor for K4_20
};

//export
try{module.exports=constants;}catch(e){}
