/* 
  STATE VARIABLES AND MASS RATIOS ENCAPSULATION

  Each removal technology will be a method inside state variables, implemented in its own file (e.g. nitrification.js)
  as "State_Variables.prototype.technology_name=function(){}"
  technologies are: primary-settler, activated-sludge, nitrification, denitrification, chemical-P-removal

  A State_Variables oject represents an arrow in a WWTP model, for example:

  Qi → [PST] → [AS] → [nitrification] → Qe
         ↓      ↓            ↓
         Qw     Qw           Qw

  Summary of this file:
    1. class definition (data structure)
    2. class methods (prototypes)
    3. tests
*/

class State_Variables{
  constructor(Q, S_VFA, S_FBSO, X_BPO, X_UPO, S_USO, X_iSS, S_FSA, S_OP, S_NOx){
    //inputs and default values
    this.Q = Q||25000; //m3/d | flowrate 
    this.name="stream";
    this.components={ 
      S_VFA : isNaN(S_VFA ) ? 50    : S_VFA , //mg/L | biodegradable   soluble     organics (BSO) volatile fatty acids
      S_FBSO: isNaN(S_FBSO) ? 115   : S_FBSO, //mg/L | biodegradable   soluble     organics (BSO) fermentable
      X_BPO : isNaN(X_BPO ) ? 440   : X_BPO , //mg/L | biodegradable   particulate organics (BPO)
      X_UPO : isNaN(X_UPO ) ? 100   : X_UPO , //mg/L | unbiodegradable particulate organics (UPO)
      S_USO : isNaN(S_USO ) ? 45    : S_USO , //mg/L | unbiodegradable soluble     organics (USO)
      X_iSS : isNaN(X_iSS ) ? 60    : X_iSS , //mg/L | inorganic inert suspended solids (sand)
      S_FSA : isNaN(S_FSA ) ? 39.1  : S_FSA , //mg/L | inorganic free saline ammonia (NH4)
      S_OP  : isNaN(S_OP  ) ? 7.28  : S_OP  , //mg/L | inorganic orthophosphate (PO4)
      S_NOx : isNaN(S_NOx ) ? 0     : S_NOx , //mg/L | (NOT PART OF TKN) inorganic nitrite and nitrate (NO2 + NO3)
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
      /*VFA*/ f_CV_VFA  : 1.0667, f_C_VFA  : 0.400, f_N_VFA  : 0.0000, f_P_VFA  : 0.0000,
      /*FBS*/ f_CV_FBSO : 1.4200, f_C_FBSO : 0.471, f_N_FBSO : 0.0464, f_P_FBSO : 0.0118,
      /*BPO*/ f_CV_BPO  : 1.5230, f_C_BPO  : 0.498, f_N_BPO  : 0.0323, f_P_BPO  : 0.0072,
      /*UPO*/ f_CV_UPO  : 1.4810, f_C_UPO  : 0.518, f_N_UPO  : 0.1000, f_P_UPO  : 0.0250,
      /*USO*/ f_CV_USO  : 1.4930, f_C_USO  : 0.498, f_N_USO  : 0.0366, f_P_USO  : 0.0000,
      /*--------------------------------------------------------------------------------*/
    };
  };

  //compute total COD, TOC, TKN, TP, TSS and fractionation
  get totals(){
    //<TOTALS> COD, TC, TKN, TP, VSS, TSS
      let Total_COD =
        this.components.S_VFA  +
        this.components.S_FBSO +
        this.components.S_USO  +
        this.components.X_BPO  +
        this.components.X_UPO  ;
      let Total_TOC = 
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
    //</TOTALS>

    //COD
      let bsCOD = this.components.S_VFA + this.components.S_FBSO;
      let usCOD = this.components.S_USO;
      let bpCOD = this.components.X_BPO;
      let upCOD = this.components.X_UPO;
      let bCOD = bsCOD + bpCOD;
      let uCOD = usCOD + upCOD;
      let sCOD = bsCOD + usCOD;
      let pCOD = bpCOD + upCOD;
      let COD={
        total:{conc:Total_COD, flux:this.Q*Total_COD},
        bsCOD:{conc:bsCOD,     flux:this.Q*bsCOD},
        usCOD:{conc:usCOD,     flux:this.Q*usCOD},
        bpCOD:{conc:bpCOD,     flux:this.Q*bpCOD},
        upCOD:{conc:upCOD,     flux:this.Q*upCOD},
        bCOD :{conc:bCOD,      flux:this.Q*bCOD},
        uCOD :{conc:uCOD,      flux:this.Q*uCOD},
        sCOD :{conc:sCOD,      flux:this.Q*sCOD},
        pCOD :{conc:pCOD,      flux:this.Q*pCOD},
      };

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
      let TOC = {
        total:{conc:Total_TOC, flux:this.Q*Total_TOC},
        bsOC :{conc:bsOC,      flux:this.Q*bsOC},
        usOC :{conc:usOC,      flux:this.Q*usOC},
        bpOC :{conc:bpOC,      flux:this.Q*bpOC},
        upOC :{conc:upOC,      flux:this.Q*upOC},
        bOC  :{conc:bOC,       flux:this.Q*bOC},
        uOC  :{conc:uOC,       flux:this.Q*uOC},
        sOC  :{conc:sOC,       flux:this.Q*sOC},
        pOC  :{conc:pOC,       flux:this.Q*pOC},
      };

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
      let TKN = {
        total:{conc:Total_TKN, flux:this.Q*Total_TKN},
        FSA  :{conc:this.components.S_FSA,flux:this.Q*this.components.S_FSA},
        organic:{
          total:{conc:sON+pON,   flux:this.Q*(sON+pON)},
          bsON :{conc:bsON,      flux:this.Q*bsON},
          usON :{conc:usON,      flux:this.Q*usON},
          bpON :{conc:bpON,      flux:this.Q*bpON},
          upON :{conc:upON,      flux:this.Q*upON},
          bON  :{conc:bON,       flux:this.Q*bON},
          uON  :{conc:uON,       flux:this.Q*uON},
          sON  :{conc:sON,       flux:this.Q*sON},
          pON  :{conc:pON,       flux:this.Q*pON},
        },
      };

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
      let TP = {
        total:{conc:Total_TP, flux:this.Q*Total_TP},
        OP  :{conc:this.components.S_OP,flux:this.Q*this.components.S_OP},
        organic:{
          total:{conc:sOP+pOP,   flux:this.Q*(sOP+pOP)},
          bsOP :{conc:bsOP,      flux:this.Q*bsOP},
          usOP :{conc:usOP,      flux:this.Q*usOP},
          bpOP :{conc:bpOP,      flux:this.Q*bpOP},
          upOP :{conc:upOP,      flux:this.Q*upOP},
          bOP  :{conc:bOP,       flux:this.Q*bOP},
          uOP  :{conc:uOP,       flux:this.Q*uOP},
          sOP  :{conc:sOP,       flux:this.Q*sOP},
          pOP  :{conc:pOP,       flux:this.Q*pOP},
        },
      };

    //TSS
      let bVSS = this.components.X_BPO / this.mass_ratios.f_CV_BPO;
      let uVSS = this.components.X_UPO / this.mass_ratios.f_CV_UPO;
      let TSS={
        total:{conc:Total_TSS,  flux:this.Q*Total_TSS},
        iSS  :{conc:this.components.X_iSS, flux:this.Q*this.components.X_iSS},
        VSS  :{
          total:{conc:Total_VSS, flux:this.Q*Total_VSS},
          bVSS :{conc:bVSS,      flux:this.Q*bVSS},
          uVSS :{conc:uVSS,      flux:this.Q*uVSS},
        },
      };
    //RESULTS (in g/m3)
    let totals={COD, TOC, TKN, TP, TSS};
    //console.log(totals);
    return totals;
  };

  //set the value of a single state variable, for example -> sv.set("S_VFA",10);
  set(key, newValue){
    if(this.components[key]===undefined) throw 'key '+key+' not found';
    if(typeof newValue != 'number')      throw 'newValue is not a number';
    this.components[key]=newValue;
  };
}

//node export
if(typeof document == "undefined"){module.exports=State_Variables;}

/*test*/
(function test(){
  let sv = new State_Variables(25);
  console.log(sv.components);
  console.log(sv.totals);
  return;
  //create 2 scenarios: raw ww, settled ww
  //1. raw ww
    let raw = new State_Variables();
    raw.set("X_BPO", 707);
    raw.set("X_UPO", 150);
    raw.set("X_iSS", 100);
    raw.set("S_VFA", 50);
    raw.set("S_FBSO",186);
    raw.set("S_USO", 58);
    raw.set("S_FSA", 59.6);
    raw.set("S_OP",  14.15);
    console.log(raw.totals);
  //2. settled ww (=primary settler effluent)
    let set = new State_Variables();
    set.set('X_BPO', 301);
    set.set('X_UPO', 20);
    set.set('X_iSS', 34);
    set.set('S_VFA', 50);
    set.set('S_FBSO',186);
    set.set('S_USO', 58);
    set.set('S_FSA', 59.6);
    set.set('S_OP',  14.15);
    console.log(set.totals);
  /* original numbers from george ekama
    inputs:
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
    outputs:
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
  */
})();
