/*
 * All kinetic constants
**/

const constants={
  //activated sludge
  YH         : 0.666, //gCOD/gCOD | heterotrophic yield (not affected by temperature)
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
  theta_pH : 2.350, //ø         | autotrophic pH sensitivity coefficient
  Ki       : 1.130, //ø         | autotrophic pH inhibition to µA
  Kii      : 0.300, //ø         | autotrophic pH inhibition to µA
  Kmax     : 9.500, //ø         | autotrophic pH inhibition to µA
  YA       : 0.100, //gVSS/gFSA | autotrophic yield
  Kn       : 1.000, //mgN/L     | ammonia half saturation coefficient at 20ºC
  theta_Kn : 1.123, //ø         | Kn temperature correction factor
  bA       : 0.040, //1/d       | autotrophic endogenous respiration rate at 20ºC
  theta_bA : 1.029, //ø         | bA temperature correction factor

  //denitrification
  K1_20   : 0.720, //gN/gVSS·d | at 20ºC page 482 and 113
  K2_20   : 0.101, //gN/gVSS·d | at 20ºC page 482 and 113
  theta_K1: 1.200, //ø         | temperature correction factor for K1_20
  theta_K2: 1.080, //ø         | temperature correction factor for K2_20

  //not used (denitrification)
  K3_20   : 0.072, //gN/gVSS·d | at 20ºC page 482 and 113
  K4_20   : 0.048, //gN/gVSS·d | at 20ºC page 482 and 113
  theta_K3: 1.029, //ø         | temperature correction factor for K3_20
  theta_K4: 1.029, //ø         | temperature correction factor for K4_20

  info:{
    YH         :{unit:"gCOD/gCOD", descr:"heterotrophic yield (not affected by temperature)"},
    bH         :{unit:"1/d",       descr:"heterotrophic endogenous respiration rate at 20ºC"},
    theta_bH   :{unit:"ø",         descr:"bH temperature correction factor"},
    k_v20      :{unit:"L/mgVSS·d", descr:"constant for not degraded bCOD (FBSO)"},
    theta_k_v20:{unit:"ø",         descr:"k_v20 temperature correction factor"},
    fH         :{unit:"ø",         descr:"heterotrophic endogenous residue fraction"},
    f_iOHO     :{unit:"giSS/gVSS", descr:"iSS content of OHOs"},
    µAm        :{unit:"1/d",       descr:"autotrophic max specific growth rate at 20ºC"},
    theta_µAm  :{unit:"ø",         descr:"µAm temperature correction factor"},
    K_O        :{unit:"mgDO/L",    descr:"autotrophic DO µA sensitivity constant"},
    theta_pH   :{unit:"ø",         descr:"autotrophic pH sensitivity coefficient"},
    Ki         :{unit:"ø",         descr:"autotrophic pH inhibition to µA"},
    Kii        :{unit:"ø",         descr:"autotrophic pH inhibition to µA"},
    Kmax       :{unit:"ø",         descr:"autotrophic pH inhibition to µA"},
    YA         :{unit:"gVSS/gFSA", descr:"autotrophic yield"},
    Kn         :{unit:"mgN/L",     descr:"ammonia half saturation coefficient at 20ºC"},
    theta_Kn   :{unit:"ø",         descr:"Kn temperature correction factor"},
    bA         :{unit:"1/d",       descr:"autotrophic endogenous respiration rate at 20ºC"},
    theta_bA   :{unit:"ø",         descr:"bA temperature correction factor"},
    K1_20      :{unit:"gN/gVSS·d", descr:"DN K1 at 20ºC page 482 and 113"},
    theta_K1   :{unit:"ø",         descr:"temperature correction factor for K1_20"},
    K2_20      :{unit:"gN/gVSS·d", descr:"DN K2 at 20ºC page 482 and 113"},
    theta_K2   :{unit:"ø",         descr:"temperature correction factor for K2_20"},
    //K3_20    :{unit:"gN/gVSS·d", descr:"DN K3 at 20ºC page 482 and 113"},
    //K4_20    :{unit:"gN/gVSS·d", descr:"DN K4 at 20ºC page 482 and 113"},
    //theta_K3 :{unit:"ø",         descr:"temperature correction factor for K3_20"},
    //theta_K4 :{unit:"ø",         descr:"temperature correction factor for K4_20"},
  },
};

//export
try{module.exports=constants;}catch(e){}
