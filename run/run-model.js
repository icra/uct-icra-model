/*
  This script runs the full model.
  It can be used as an example.
  (George Ekama's sample inputs from his spreadsheet)

  The input structure for the model is:
    (1) influent state variables,
    (2) influent mass ratios,
    (3) plant configuration,
    (4) plant parameters and
    (5) kinetic constants
*/

/*load model*/
State_Variables = require('../src/state-variables.js'); //class
constants       = require('../src/constants.js');       //object
Plant           = require('../src/plant.js');           //class

//new influent state variables
let influent=new State_Variables(
   60.00, //Q      (ML/d): flowrate
   50.00, //S_VFA  (mg/L): volatile fatty acids (biodegradable soluble organics)
  186.00, //S_FBSO (mg/L): fermentable biodegradable soluble organics
  707.00, //X_BPO  (mg/L): biodegradable particulated organics
  149.00, //X_UPO  (mg/L): unbiodegradable particulated organics
   57.50, //S_USO  (mg/L): unbiodegradable soluble organics
  100.00, //X_iSS  (mg/L): inert suspended solids (inorganic)
   59.80, //S_FSA  (mg/L): inorganic free saline ammonia (NH4, part of TKN)
   14.15, //S_OP   (mg/L): inorganic orthophosphate (PO4)
    0.00, //S_NOx  (mg/L): inorganic nitrite and nitrate (NO2 + NO3, not part of TKN)
    0.00, //S_O2   (mg/L): dissolved oxygen
    0.00, //X_OHO  (mg/L): ordinary heterotrhophic organisms (expressed as COD)
    0.00, //X_PAO  (mg/L): phosphate accumulating organisms (expressed as COD)
);

//influent mass ratios
influent.mass_ratios={
  /*----+------------------+----------------+-----------------+-----------------+
  |     | COD              | C              | N               | P               |
  +-----+------------------+----------------+-----------------+-----------------*/
  /*VFA*/ f_CV_VFA : 1.0667, f_C_VFA : 0.400, f_N_VFA : 0.0000, f_P_VFA : 0.0000,
  /*FBS*/ f_CV_FBSO: 1.4200, f_C_FBSO: 0.471, f_N_FBSO: 0.0231, f_P_FBSO: 0.0068,
  /*BPO*/ f_CV_BPO : 1.5230, f_C_BPO : 0.498, f_N_BPO : 0.0350, f_P_BPO : 0.0054,
  /*UPO*/ f_CV_UPO : 1.4810, f_C_UPO : 0.518, f_N_UPO : 0.1000, f_P_UPO : 0.0250,
  /*USO*/ f_CV_USO : 1.4930, f_C_USO : 0.498, f_N_USO : 0.0258, f_P_USO : 0.0000,
  /*OHO*/ f_CV_OHO : 1.4810, f_C_OHO : 0.518, f_N_OHO : 0.1000, f_P_OHO : 0.0250,
  /*PAO*/ f_CV_PAO : 1.4810, f_C_PAO : 0.518, f_N_PAO : 0.1000, f_P_PAO : 0.3800,
};

//plant configuration: enable modules (on=true/off=false)
let configuration={
  pst: true,  //primary settler
  bpr: false, //bio P removal
  nit: true,  //nitrification
  dn:  true,  //denitrification
};

//parameters: plant settings
let parameters={
  fw          :     0.00893, //ø       | PST | fraction of Q that goes to wastage
  removal_BPO :    57.42000, //%       | PST | removal of the component X_BPO
  removal_UPO :    86.67000, //%       | PST | removal of the component X_UPO
  removal_iSS :    65.70000, //%       | PST | removal of the component X_iSS

  T           :    16.00000, //ºC      | AS  | temperature
  Vp          : 25341.00000, //m3      | AS  | reactor volume
  Rs          :    11.21000, //d       | AS  | solids retention time or sludge age
  DO          :     2.00000, //mgO/L   | AS  | DO in the aerobic reactor
  RAS         :     1.00000, //ø       | AS  | SST underflow recycle ratio
  waste_from  : "reactor",   //option  | AS  | waste_from | options {'reactor','sst'}

  mass_MeCl3  :     0.00000, //kg/d    | CPR | mass of FeCl3 added for chemical P removal

  S_NOx_RAS   :     0.50000, //mgNOx/L | BPR | NOx concentration at RAS
  DO_RAS      :     0.00000, //mgO/L   | BPR | Dissolved oxygen at recycle
  f_AN        :     0.10000, //ø       | BPR | anaerobic mass fraction, different from fxt, value must be <= fxm
  an_zones    :     2.00000, //        | BPR | number of anaerobic zones

  SF          :     1.25000, //ø       | NIT | safety factor. design choice. Moves the sludge age
  fxt         :     0.44800, //ø       | NIT | current unaerated sludge mass fraction
  pH          :     7.20000, //ø       | NIT | pH

  IR          :     6.00000, //ø       | DN  | internal recirculation ratio
  influent_alk:   300.00000, //mg/L    | DN  | influent alkalinity (mg/L CaCO3)

  DSVI        :   120.00000, //mL/gTSS | CE  | sludge settleability
  A_ST        : 30000.00000, //m2      | CE  | area of the settler
  fq          :     2.40000, //ø       | CE  | peak flow (Qmax/Qavg)
};

//kinetic and stoichiometric constants
Object.assign(constants,{
  YH        :    0.666, //gCOD/gCOD | heterotrophic yield (not affected by temperature)
  bH        :    0.240, //1/d       | heterotrophic endogenous respiration rate at 20ºC
  ϴ_bH      :    1.029, //ø         | bH temperature correction factor
  k_v20     : 1000.000, //L/mgVSS·d | constant for not degraded bCOD (FBSO)
  ϴ_k_v20   :    1.035, //ø         | k_v20 temperature correction factor
  fH        :    0.200, //ø         | heterotrophic endogenous residue fraction
  f_iOHO    :    0.150, //giSS/gVSS | iSS content of OHOs
  µAm       :    0.540, //1/d       | autotrophic max specific growth rate at 20ºC
  ϴ_µAm     :    1.123, //ø         | µAm temperature correction factor
  K_O       :    0.400, //mgDO/L    | autotrophic DO µA sensitivity constant
  ϴ_pH      :    2.350, //ø         | autotrophic pH sensitivity coefficient
  Ki        :    1.130, //ø         | autotrophic pH inhibition to µA
  Kii       :    0.300, //ø         | autotrophic pH inhibition to µA
  Kmax      :    9.500, //ø         | autotrophic pH inhibition to µA
  YA        :    0.100, //gVSS/gFSA | autotrophic yield
  Kn        :    1.000, //mgN/L     | ammonia half saturation coefficient at 20ºC
  ϴ_Kn      :    1.123, //ø         | Kn temperature correction factor
  bA        :    0.040, //1/d       | autotrophic endogenous respiration rate at 20ºC
  ϴ_bA      :    1.029, //ø         | bA temperature correction factor
  K1_20     :    0.720, //gN/gVSS·d | DN K1 at 20ºC page 482 and 113
  ϴ_K1      :    1.200, //ø         | temperature correction factor for K1_20
  K2_20     :    0.101, //gN/gVSS·d | DN K2 at 20ºC page 482 and 113
  ϴ_K2      :    1.080, //ø         | temperature correction factor for K2_20
  b_PAO     :    0.040, //1/d       | PAO endogenous residue respiration rate at 20ºC
  ϴ_b_PAO   :    1.029, //ø         | b_PAO temperature correction factor
  f_PAO     :    0.250, //ø         | PAO endogenous residue fraction
  f_P_iSS   :    0.020, //gP/giSS   | fraction of P in iSS
  f_iPAO    :    1.300, //giSS/gVSS | fraction of iSS in PAO
  f_PO4_rel :    0.500, //gP/gCOD   | ratio of P release/VFA uptake (1molP/1molCOD)
  K2_20_PAO :    0.255, //gN/gVSS·d | at 20ºC page 482 and 113
  ϴ_K2_PAO  :    1.080, //ø         | temperature correction factor for K2_20
});

/*create plant, run model and display results*/
let plant = new Plant(influent, configuration, parameters, constants);
let run = plant.run(debug=true);
console.log(run);
