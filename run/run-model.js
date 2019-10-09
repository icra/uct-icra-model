/*
  standalone script that creates a new plant and runs the model
*/

/*load model*/
const State_Variables = require('../src/state-variables.js'); //class
const Plant           = require('../src/plant.js');           //class

/*INPUTS: CREATE INFLUENT, CONFIGURATION AND PARAMETERS*/

//create new influent
let influent=new State_Variables(
  25,   //Q      (ML/d): flowrate
  50,   //S_VFA  (mg/L): volatile fatty acids (biodegradable soluble organics)
  115,  //S_FBSO (mg/L): fermentable biodegradable soluble organics
  440,  //X_BPO  (mg/L): biodegradable particulated organics
  100,  //X_UPO  (mg/L): unbiodegradable particulated organics
  45,   //S_USO  (mg/L): unbiodegradable soluble organics
  60,   //X_iSS  (mg/L): inert suspended solids (inorganic)
  39.1, //S_FSA  (mg/L): inorganic free saline ammonia (NH4, part of TKN)
  7.28, //S_OP   (mg/L): inorganic orthophosphate (PO4)
  0,    //S_NOx  (mg/L): inorganic nitrite and nitrate (NO2 + NO3, not part of TKN)
  0     //X_OHO  (mg/L): ordinary heterotrhophic organisms (expressed as COD)
);

//define influent mass ratios
influent.mass_ratios={
  /*----+------------------+----------------+-----------------+-----------------+
  |     | COD              | C              | N               | P               |
  +-----+------------------+----------------+-----------------+-----------------*/
  /*VFA*/ f_CV_VFA : 1.0667, f_C_VFA : 0.400, f_N_VFA : 0.0000, f_P_VFA : 0.0000,
  /*FBS*/ f_CV_FBSO: 1.4200, f_C_FBSO: 0.471, f_N_FBSO: 0.0464, f_P_FBSO: 0.0118,
  /*BPO*/ f_CV_BPO : 1.5230, f_C_BPO : 0.498, f_N_BPO : 0.0323, f_P_BPO : 0.0072,
  /*UPO*/ f_CV_UPO : 1.4810, f_C_UPO : 0.518, f_N_UPO : 0.1000, f_P_UPO : 0.0250,
  /*USO*/ f_CV_USO : 1.4930, f_C_USO : 0.498, f_N_USO : 0.0366, f_P_USO : 0.0000,
  /*OHO*/ f_CV_OHO : 1.4810, f_C_OHO : 0.518, f_N_OHO : 0.1000, f_P_OHO : 0.0250,
};

//plant configuration: enable modules (on=true/off=false)
let configuration={
  pst:true,  //primary settler
  nit:true,  //nitrification
  dn:true,   //denitrification
  cpr:true,  //chemical P removal
  bip:false, //bio P removal
};

//parameters: plant settings
let parameters={
  fw          : 0.00500,   //ø       | PST | fraction of Q that goes to wastage
  removal_BPO : 42.3352,   //%       | PST | removal of the component X_BPO
  removal_UPO : 90.0500,   //%       | PST | removal of the component X_UPO
  removal_iSS : 75.1250,   //%       | PST | removal of the component X_iSS
  T           : 16.0000,   //ºC      | AS  | temperature
  Vp          : 8473.30,   //m3      | AS  | reactor volume
  Rs          : 15.0000,   //d       | AS  | solids retention time or sludge age
  RAS         : 1.00000,   //ø       | AS  | SST underflow recycle ratio
  DSVI        : 120,       //mL/gTSS | CE  | sludge settleability
  A_ST        : 30000,     //m2      | CE  | area of the settler
  fq          : 2.4,       //ø       | CE  | peak flow (Qmax/Qavg)
  waste_from  : "reactor", //option  | AS  | waste_from | options {'reactor','sst'}
  SF          : 1.25000,   //ø       | NIT | safety factor. design choice. Moves the sludge age
  fxt         : 0.39000,   //ø       | NIT | current unaerated sludge mass fraction
  DO          : 2.00000,   //mgO/L   | NIT | DO in the aerobic reactor
  pH          : 7.20000,   //ø       | NIT | pH
  IR          : 5.40000,   //ø       | DN  | internal recirculation ratio
  DO_RAS      : 1.00000,   //mgO/L   | DN  | DO in the underflow recycle
  influent_alk: 250.000,   //mg/L    | DN  | influent alkalinity (mg/L CaCO3)
  mass_FeCl3  : 3000.00,   //kg/d    | CPR | mass of FeCl3 added for chemical P removal
};

//define kinetic constants
let constants={
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
  //K3_20   : 0.072, //gN/gVSS·d | at 20ºC page 482 and 113
  //K4_20   : 0.048, //gN/gVSS·d | at 20ºC page 482 and 113
  theta_K1: 1.200, //ø         | temperature correction factor for K1_20
  theta_K2: 1.080, //ø         | temperature correction factor for K2_20
  //theta_K3: 1.029, //ø         | temperature correction factor for K3_20
  //theta_K4: 1.029, //ø         | temperature correction factor for K4_20
};

/*CREATE PLANT, RUN MODEL, DISPLAY RESULTS*/
let plant = new Plant(influent, configuration, parameters);
let results = plant.run();
console.log(results);
