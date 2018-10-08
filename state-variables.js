/* STATE VARIABLES AND MASS RATIOS ENCAPSULATION
  summary of this file:
    1. class definition (data structure)
    2. class methods (functions)
    3. tests
*/

//1. class definition
function State_Variables(){
  this.components={ //components and default values (inputs)
    organic:{
      S_VFA  : 50,  // biodegradable   soluble     organics (BSO) volatile fatty acids
      S_FBSO : 186, // biodegradable   soluble     organics (BSO) fermentable
      X_BPO  : 707, // biodegradable   particulate organics (BPO)
      X_UPO  : 150, // unbiodegradable particulate organics (UPO)
      S_USO  : 58,  // unbiodegradable soluble     organics (USO)
    },
    inorganic:{
      X_iSS  : 100,   // inert suspended solids
      S_FSA  : 59.6,  // free saline ammonia
      S_OP   : 14.15, // orthophosphate
    },
  };
  this.mass_ratios={
    /* mass ratios for COD, C, N, P vs:
        -  BPO       (biodegradable    particulate  organics)
        -  VFA+FBSO  (biodegradable    soluble      organics)
        -  UPO       (unbiodegradable  particulate  organics)
        -  USO       (unbiodegradable  soluble      organics)*/
    /*----+------------------+-----------------+------------------+-------------------+
    |     | COD              | C               | N                | P                 |
    +-----+------------------+-----------------+------------------+-------------------*/
    /*VFA*/ f_CV_VFA  : 1.067, f_C_VFA  : 0.400, f_N_VFA  : 0.0000, f_P_VFA  : 0.0000,
    /*FBS*/ f_CV_FBSO : 1.420, f_C_FBSO : 0.471, f_N_FBSO : 0.0231, f_P_FBSO : 0.0068,
    /*BPO*/ f_CV_BPO  : 1.523, f_C_BPO  : 0.498, f_N_BPO  : 0.0350, f_P_BPO  : 0.0054,
    /*UPO*/ f_CV_UPO  : 1.481, f_C_UPO  : 0.518, f_N_UPO  : 0.1000, f_P_UPO  : 0.0250,
    /*USO*/ f_CV_USO  : 1.493, f_C_USO  : 0.498, f_N_USO  : 0.0258, f_P_USO  : 0.0000,
    /*--------------------------------------------------------------------------------*/
  };
};

//2. class methods: compute total: COD, C, TKN, TP, VSS, TSS
State_Variables.prototype.compute_totals=function(){
  //TOTAL: COD, C, TKN, TP, VSS, TSS
    let Total_COD = Object.values(this.components.organic).reduce((pr,cu)=>{return pr+cu},0);
    let Total_C = 
      this.mass_ratios.f_C_VFA  / this.mass_ratios.f_CV_VFA  * this.components.organic.S_VFA  +
      this.mass_ratios.f_C_FBSO / this.mass_ratios.f_CV_FBSO * this.components.organic.S_FBSO +
      this.mass_ratios.f_C_USO  / this.mass_ratios.f_CV_USO  * this.components.organic.S_USO  +
      this.mass_ratios.f_C_BPO  / this.mass_ratios.f_CV_BPO  * this.components.organic.X_BPO  +
      this.mass_ratios.f_C_UPO  / this.mass_ratios.f_CV_UPO  * this.components.organic.X_UPO  ;
    let Total_TKN = 
      this.components.inorganic.S_FSA + 
      this.mass_ratios.f_N_VFA  / this.mass_ratios.f_CV_VFA  * this.components.organic.S_VFA  +
      this.mass_ratios.f_N_FBSO / this.mass_ratios.f_CV_FBSO * this.components.organic.S_FBSO +
      this.mass_ratios.f_N_USO  / this.mass_ratios.f_CV_USO  * this.components.organic.S_USO  +
      this.mass_ratios.f_N_BPO  / this.mass_ratios.f_CV_BPO  * this.components.organic.X_BPO  +
      this.mass_ratios.f_N_UPO  / this.mass_ratios.f_CV_UPO  * this.components.organic.X_UPO  ;
    let Total_TP = 
      this.components.inorganic.S_OP +
      this.mass_ratios.f_P_VFA  / this.mass_ratios.f_CV_VFA  * this.components.organic.S_VFA  +
      this.mass_ratios.f_P_FBSO / this.mass_ratios.f_CV_FBSO * this.components.organic.S_FBSO +
      this.mass_ratios.f_P_USO  / this.mass_ratios.f_CV_USO  * this.components.organic.S_USO  +
      this.mass_ratios.f_P_BPO  / this.mass_ratios.f_CV_BPO  * this.components.organic.X_BPO  +
      this.mass_ratios.f_P_UPO  / this.mass_ratios.f_CV_UPO  * this.components.organic.X_UPO  ;
    let Total_VSS =
      this.components.organic.X_BPO / this.mass_ratios.f_CV_BPO + 
      this.components.organic.X_UPO / this.mass_ratios.f_CV_UPO ;
    let Total_TSS = Total_VSS + this.components.inorganic.X_iSS;

  //RESULTS (in g/m3)
  let totals={
    Total_COD,
    Total_C,
    Total_TKN,
    Total_TP,
    Total_VSS,
    Total_TSS
  };

  //console.log(totals);console.log('\n'); //debug
  return totals;
};

//3. tests
  /* original numbers 
    inputs {
      X_BPO_non_set_inf: 301,
      X_BPO_set_inf:     406,
      X_UPO_non_set_inf: 20,
      X_UPO_set_inf:     130,
      X_iSS_raw_inf:     100,
      X_iSS_set_inf:     34,
      S_VFA_inf:         50,
      S_FBSO_inf:        186,
      S_USO_inf:         58,
      S_FSA_inf:         59.6,
      S_OP_inf:          14.15,
    }
    outputs {
      Total_COD_raw:  1151,
      Total_C_raw:    383.42859376145907,
      Total_TKN_raw:  90.00388139115904,
      Total_TP_raw:   20.07954011687898,
      Total_VSS_raw:  565.4982813603522,
      Total_TSS_raw:  665.4982813603522,

      Total_COD_set:  615,
      Total_C_set:    205.2029144077899,
      Total_TKN_set:  71.8957593834829,
      Total_TP_set:   16.44554966748785,
      Total_VSS_set:  211.14063318116143,
      Total_TSS_set:  245.14063318116143
    }
  */

//2 scenarios: raw ww, settled ww
/*
let sv = new State_Variables(); //declare new state variables identifier 'sv'
let results; //declare identifier for results
  //1. raw ww
    console.log('Scenario 1: raw ww');
    sv.components.organic.X_BPO   = 707;
    sv.components.organic.X_UPO   = 150;
    sv.components.inorganic.X_iSS = 100;
    sv.components.organic.S_VFA   = 50;
    sv.components.organic.S_FBSO  = 186;
    sv.components.organic.S_USO   = 58;
    sv.components.inorganic.S_FSA = 59.6;
    sv.components.inorganic.S_OP  = 14.15;
    results = sv.compute_totals();

  //2. settled ww
    console.log('Scenario 2: settled ww');
    sv.components.organic.X_BPO   = 301;
    sv.components.organic.X_UPO   = 20;
    sv.components.inorganic.X_iSS = 34;
    sv.components.organic.S_VFA   = 50;
    sv.components.organic.S_FBSO  = 186;
    sv.components.organic.S_USO   = 58;
    sv.components.inorganic.S_FSA = 59.6;
    sv.components.inorganic.S_OP  = 14.15;
    results = sv.compute_totals();
    */
