/* STATE VARIABLES AND MASS RATIOS ENCAPSULATION
  summary of this file:
    1. class definition (data structure)
    2. class methods (functions)
    3. tests
*/

//1. class definition
function State_Variables(name){
  this.name=name||"wastewater";
  this.created  = new Date(), /*future*/
  this.modified = new Date(), /*future*/
  this.components={ //components and default values (inputs)
    S_VFA  : 50,    // biodegradable   soluble     organics (BSO) volatile fatty acids
    S_FBSO : 186,   // biodegradable   soluble     organics (BSO) fermentable
    X_BPO  : 707,   // biodegradable   particulate organics (BPO)
    X_UPO  : 150,   // unbiodegradable particulate organics (UPO)
    S_USO  : 58,    // unbiodegradable soluble     organics (USO)
    X_iSS  : 100,   // inorganic inert suspended solids (sand)
    S_OP   : 14.15, // inorganic orthophosphate (PO4)
    S_FSA  : 59.6,  // inorganic free saline ammonia (NH4)
    S_NOx  : 0,     // inorganic nitrite and nitrate (NO2 + NO3)
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

//export for nodejs
if(typeof module != "undefined"){module.exports=State_Variables;}

//2. class methods: compute total: COD, C, TKN, TP, VSS, TSS
State_Variables.prototype.compute_totals=function(){
  //TOTALS: COD, TC, TKN, TP, VSS, TSS
    let Total_COD =
      this.components.S_VFA  +
      this.components.S_FBSO +
      this.components.S_USO  +
      this.components.X_BPO  +
      this.components.X_UPO  ;
    let Total_TC = 
      this.mass_ratios.f_C_VFA  / this.mass_ratios.f_CV_VFA  * this.components.S_VFA  +
      this.mass_ratios.f_C_FBSO / this.mass_ratios.f_CV_FBSO * this.components.S_FBSO +
      this.mass_ratios.f_C_USO  / this.mass_ratios.f_CV_USO  * this.components.S_USO  +
      this.mass_ratios.f_C_BPO  / this.mass_ratios.f_CV_BPO  * this.components.X_BPO  +
      this.mass_ratios.f_C_UPO  / this.mass_ratios.f_CV_UPO  * this.components.X_UPO  ;
    let Total_TKN = 
      this.components.S_FSA + 
      this.mass_ratios.f_N_VFA  / this.mass_ratios.f_CV_VFA  * this.components.S_VFA  +
      this.mass_ratios.f_N_FBSO / this.mass_ratios.f_CV_FBSO * this.components.S_FBSO +
      this.mass_ratios.f_N_USO  / this.mass_ratios.f_CV_USO  * this.components.S_USO  +
      this.mass_ratios.f_N_BPO  / this.mass_ratios.f_CV_BPO  * this.components.X_BPO  +
      this.mass_ratios.f_N_UPO  / this.mass_ratios.f_CV_UPO  * this.components.X_UPO  ;
    let Total_TP = 
      this.components.S_OP +
      this.mass_ratios.f_P_VFA  / this.mass_ratios.f_CV_VFA  * this.components.S_VFA  +
      this.mass_ratios.f_P_FBSO / this.mass_ratios.f_CV_FBSO * this.components.S_FBSO +
      this.mass_ratios.f_P_USO  / this.mass_ratios.f_CV_USO  * this.components.S_USO  +
      this.mass_ratios.f_P_BPO  / this.mass_ratios.f_CV_BPO  * this.components.X_BPO  +
      this.mass_ratios.f_P_UPO  / this.mass_ratios.f_CV_UPO  * this.components.X_UPO  ;
    let Total_VSS =
      this.components.X_BPO / this.mass_ratios.f_CV_BPO + 
      this.components.X_UPO / this.mass_ratios.f_CV_UPO ;
    let Total_TSS = Total_VSS + this.components.X_iSS;
  //COD
    let bsCOD = this.components.S_VFA + this.components.S_FBSO;
    let usCOD = this.components.S_USO;
    let bpCOD = this.components.X_BPO;
    let upCOD = this.components.X_UPO;
    let bCOD = bsCOD + bpCOD;
    let uCOD = usCOD + upCOD;
    let sCOD = bsCOD + usCOD;
    let pCOD = bpCOD + upCOD;
    let COD=[
      {COD:Total_COD, bCOD,  uCOD},
      {sCOD,          bsCOD, usCOD},
      {pCOD,          bpCOD, upCOD},
    ];
  //Organic Carbon
    let bsOC = 
      this.mass_ratios.f_C_VFA  /this.mass_ratios.f_CV_VFA *this.components.S_VFA +
      this.mass_ratios.f_C_FBSO /this.mass_ratios.f_CV_FBSO*this.components.S_FBSO;
    let usOC = this.mass_ratios.f_C_USO/this.mass_ratios.f_CV_USO*this.components.S_USO;
    let bpOC = this.mass_ratios.f_C_BPO/this.mass_ratios.f_CV_BPO*this.components.X_BPO;
    let upOC = this.mass_ratios.f_C_UPO/this.mass_ratios.f_CV_UPO*this.components.X_UPO;
    let bOC = bsOC + bpOC;
    let uOC = usOC + upOC;
    let sOC = bsOC + usOC;
    let pOC = bpOC + upOC;
    let TOC=[
      {TOC:sOC+pOC, bOC,  uOC},
      {sOC,         bsOC, usOC},
      {pOC,         bpOC, upOC},
    ];
  //Organic Nitrogen
    let bsON = 
      this.mass_ratios.f_N_VFA /this.mass_ratios.f_CV_VFA *this.components.S_VFA +
      this.mass_ratios.f_N_FBSO/this.mass_ratios.f_CV_FBSO*this.components.S_FBSO;
    let usON = this.mass_ratios.f_N_USO/this.mass_ratios.f_CV_USO*this.components.S_USO;
    let bpON = this.mass_ratios.f_N_BPO/this.mass_ratios.f_CV_BPO*this.components.X_BPO;
    let upON = this.mass_ratios.f_N_UPO/this.mass_ratios.f_CV_UPO*this.components.X_UPO;
    let bON = bsON + bpON;
    let uON = usON + upON;
    let sON = bsON + usON;
    let pON = bpON + upON;
    let ON=[
      { ON:sON+pON, bON,  uON},
      {sON,         bsON, usON},
      {pON,         bpON, upON},
    ];
  //Organic Phosphorus
    let bsOP = 
      this.mass_ratios.f_P_VFA /this.mass_ratios.f_CV_VFA *this.components.S_VFA +
      this.mass_ratios.f_P_FBSO/this.mass_ratios.f_CV_FBSO*this.components.S_FBSO;
    let usOP = this.mass_ratios.f_P_USO/this.mass_ratios.f_CV_USO*this.components.S_USO;
    let bpOP = this.mass_ratios.f_P_BPO/this.mass_ratios.f_CV_BPO*this.components.X_BPO;
    let upOP = this.mass_ratios.f_P_UPO/this.mass_ratios.f_CV_UPO*this.components.X_UPO;
    let bOP = bsOP + bpOP;
    let uOP = usOP + upOP;
    let sOP = bsOP + usOP;
    let pOP = bpOP + upOP;
    let OP=[
      {OP:sOP+pOP,  bOP,  uOP},
      {sOP,        bsOP, usOP},
      {pOP,        bpOP, upOP},
    ];
  //VSS
    let bVSS = this.components.X_BPO / this.mass_ratios.f_CV_BPO;
    let uVSS = this.components.X_UPO / this.mass_ratios.f_CV_UPO;
    let VSS=[
      {VSS:Total_VSS, bVSS, uVSS },
    ];
  //RESULTS (in g/m3)
  let totals={
    Total_COD, COD,
    Total_TC,  TOC,
    Total_TKN, ON,
    Total_TP,  OP,
    Total_TSS, VSS,
  };
  //console.log(totals);console.log('\n'); //debug
  return totals;
};

//3. tests
  /* original numbers 
    inputs {
      X_BPO_non_set_inf: 301,
      X_UPO_non_set_inf: 20,
      X_iSS_raw_inf:     100,
      X_BPO_set_inf:     406,
      X_UPO_set_inf:     130,
      X_iSS_set_inf:     34,
      S_VFA_inf:         50,
      S_FBSO_inf:        186,
      S_USO_inf:         58,
      S_FSA_inf:         59.6,
      S_OP_inf:          14.15,
    }
    outputs {
      Total_COD_raw:  1151,
      Total_C_raw:    383.4286,
      Total_TKN_raw:  90.0039,
      Total_TP_raw:   20.0795,
      Total_VSS_raw:  565.4983,
      Total_TSS_raw:  665.4983,
      Total_COD_set:  615,
      Total_C_set:    205.2029,
      Total_TKN_set:  71.8958,
      Total_TP_set:   16.4455,
      Total_VSS_set:  211.1406,
      Total_TSS_set:  245.1406
    }
  */
  //2 scenarios: raw ww, settled ww
  /*
  let sv = new State_Variables(); //declare new state variables identifier 'sv'
  let results; //declare identifier for results
    //1. raw ww
      console.log('Scenario 1: raw ww');
      sv.components.X_BPO  = 707;
      sv.components.X_UPO  = 150;
      sv.components.X_iSS  = 100;
      sv.components.S_VFA  = 50;
      sv.components.S_FBSO = 186;
      sv.components.S_USO  = 58;
      sv.components.S_FSA  = 59.6;
      sv.components.S_OP   = 14.15;
      results = sv.compute_totals();
    //2. settled ww
      console.log('Scenario 2: settled ww');
      sv.components.X_BPO  = 301;
      sv.components.X_UPO  = 20;
      sv.components.X_iSS  = 34;
      sv.components.S_VFA  = 50;
      sv.components.S_FBSO = 186;
      sv.components.S_USO  = 58;
      sv.components.S_FSA  = 59.6;
      sv.components.S_OP   = 14.15;
      results = sv.compute_totals();
  */
