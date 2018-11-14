/* 
  STATE VARIABLES AND MASS RATIOS ENCAPSULATION

  Each removal technology will be a method inside state variables,
  implemented in its own file (e.g. nitrification.js)
  as "State_Variables.prototype.technology_name=function(){}"
  technologies are: primary-settler, activated-sludge, nitrification, denitrification, chemical-P-removal

  A State_Variables oject represents an arrow in a WWTP model, for example:

    Qi → [PST] → [AS] → [nitrification] → Qe
          ↓      ↓            ↓
          Qw     Qw           Qw

  Summary of this file:
    1. class data structure
      - Q
      - components
      - mass ratios
    2. class methods (prototypes)
      - set
      - totals
      - fluxes
      - summary
    3. test
*/

class State_Variables {
  constructor(Q, S_VFA, S_FBSO, X_BPO, X_UPO, S_USO, X_iSS, S_FSA, S_OP, S_NOx){
    //inputs and default values
    this.Q = isNaN(Q) ? 25 : Q; //ML/d | flowrate 
    this.components={ 
      S_VFA : isNaN(S_VFA ) ? 50   : S_VFA , //mg/L | biodegradable   soluble     organics (BSO) volatile fatty acids
      S_FBSO: isNaN(S_FBSO) ? 115  : S_FBSO, //mg/L | biodegradable   soluble     organics (BSO) fermentable
      X_BPO : isNaN(X_BPO ) ? 440  : X_BPO , //mg/L | biodegradable   particulate organics (BPO)
      X_UPO : isNaN(X_UPO ) ? 100  : X_UPO , //mg/L | unbiodegradable particulate organics (UPO)
      S_USO : isNaN(S_USO ) ? 45   : S_USO , //mg/L | unbiodegradable soluble     organics (USO)
      X_iSS : isNaN(X_iSS ) ? 60   : X_iSS , //mg/L | inorganic inert suspended solids (sand)
      S_FSA : isNaN(S_FSA ) ? 39.1 : S_FSA , //mg/L | inorganic free saline ammonia (NH4)
      S_OP  : isNaN(S_OP  ) ? 7.28 : S_OP  , //mg/L | inorganic orthophosphate (PO4)
      S_NOx : isNaN(S_NOx ) ? 0    : S_NOx , //mg/L | (NOT PART OF TKN) inorganic nitrite and nitrate (NO2 + NO3)
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
      /*OHO*/ f_CV_OHO  : 1.4810, f_C_OHO  : 0.518, f_N_OHO  : 0.1000, f_P_OHO  : 0.0250, 
      /*PAO*/ f_CV_PAO  : 1.4810, f_C_PAO  : 0.518, f_N_PAO  : 0.1000, f_P_PAO  : 0.0250, 
      /*--------------------------------------------------------------------------------*/
    };
  };

  //set a single state variable. example -> sv.set("S_VFA",10);
  set(key, newValue){
    if(this.components[key]===undefined) throw 'key '+key+' not found';
    if(typeof newValue != 'number')      throw 'newValue is not a number';
    this.components[key]=newValue;
  };

  //calculate totals and complete fractionation for COD, TKN, TP, TOC and TSS
  get totals(){
    //totals
      let Total_COD = this.components.S_VFA + this.components.S_FBSO + this.components.S_USO + this.components.X_BPO + this.components.X_UPO;
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

    //fractionation of COD
      let bsCOD = this.components.S_VFA + this.components.S_FBSO;
      let usCOD = this.components.S_USO;
      let bpCOD = this.components.X_BPO;
      let upCOD = this.components.X_UPO;
      let bCOD = bsCOD + bpCOD;
      let uCOD = usCOD + upCOD;
      let sCOD = bsCOD + usCOD;
      let pCOD = bpCOD + upCOD;
      let COD={
        total:Total_COD, 
        bCOD, uCOD, sCOD, pCOD,
        bsCOD, usCOD, bpCOD, upCOD,
      };

    //fractionation of Total Organic Carbon (TOC)
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
      let TOC={
        total:sOC+pOC,
        bOC, uOC, sOC, pOC,
        bsOC, usOC, bpOC, upOC,
      };

    //fractionation of Organic Nitrogen (part of TKN)
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
      let TKN={
        total:Total_TKN,
        FSA:this.components.S_FSA,
        ON:sON+pON, 
        bON, uON, sON, pON,
        bsON, usON, bpON, upON,
      }

    //fractionation of Organic Phosphorus (TP)
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
      let TP={
        total:Total_TP,
        PO4:this.components.S_OP,
        OP:sOP+pOP,
        bOP, uOP, sOP, pOP,
        bsOP, usOP, bpOP, upOP,
      };

    //fractionation of TSS (Total Supsended Solids)
      let bVSS = this.components.X_BPO / this.mass_ratios.f_CV_BPO;
      let uVSS = this.components.X_UPO / this.mass_ratios.f_CV_UPO;
      let TSS={
        total:Total_TSS,
        iSS:this.components.X_iSS,
        VSS:Total_VSS, 
        bVSS,
        uVSS,
      };

    //pack results
    return {COD,TKN,TP,TOC,TSS};
  };

  //convert components and totals to mass fluxes (kg/d)
  get fluxes(){
    let components={};
    let totals={};

    //convert components
    Object.entries(this.components).forEach(([key,value])=>{
      components[key]=this.Q*value;
    });

    //convert totals
    Object.entries(this.totals).forEach(([group_name,group])=>{
      totals[group_name]={};
      Object.entries(group).forEach(([key,val])=>{
        totals[group_name][key]=this.Q*val;
      });
    });

    return {components, totals};
  }

  //get reduced table (concentrations and fluxes combined)
  get summary(){
    let totals = this.totals;
    let fluxes = this.fluxes.totals;
    return {
      Q: this.Q,
      COD: [totals.COD.total, fluxes.COD.total],
      TKN: [totals.TKN.total, fluxes.TKN.total],
      FSA: [totals.TKN.FSA,   fluxes.TKN.FSA],
      TP:  [totals.TP.total,  fluxes.TP.total],
      PO4: [totals.TP.PO4,    fluxes.TP.PO4],
      TOC: [totals.TOC.total, fluxes.TOC.total],
      TSS: [totals.TSS.total, fluxes.TSS.total],
      iSS: [totals.TSS.iSS,   fluxes.TSS.iSS],
      VSS: [totals.TSS.VSS,   fluxes.TSS.VSS],
    }
  }

  //combine 2 state variables: return a new SV object with the sum
  combine(sv){
    let new_sv = new State_Variables(0,0,0,0,0,0,0,0,0,0);
    //new flowrate
    let Q = this.Q + sv.Q;
    new_sv.Q = Q;
    //new concentrations: sum fluxes and divide by new Q
    Object.keys(this.components).forEach(key=>{
      let mass=0;
      mass += this.Q * this.components[key];
      mass += sv.Q   * sv.components[key];
      new_sv.set(key,mass/Q);
    });
    return new_sv;
  }
}

//node export
if(typeof document == "undefined"){module.exports=State_Variables;}

/*test*/
(function test(){
  return 
  {//combine 2 state variables and check summary
    let s1 = new State_Variables(10,2,2,2,2,2,2,2,2,2);
    let s2 = new State_Variables(10,1,1,1,1,1,1,1,1,1);
    let s3 = s1.combine(s2);
    console.log(s1.summary);
    console.log(s2.summary);
    console.log(s3.summary);
    console.log(s3.components);
  };return;
  {//check totals and fluxes
    let s = new State_Variables(25);
    console.log("=== Components (mg/L) ===");  console.log(s.components);
    console.log("=== Totals (mg/L) ===");      console.log(s.totals);
    console.log("=== Fluxes (kg/d) ===");      console.log(s.fluxes);
  };return;
  {//example from george ekama (raw ww + set ww)
    // [inputs]                    [outputs]
    // S_VFA_inf:         50,      Total_COD_raw:  1151,
    // S_FBSO_inf:        186,     Total_C_raw:    383.4286,
    // S_USO_inf:         58,      Total_TKN_raw:  90.0039,
    // S_FSA_inf:         59.6,    Total_TP_raw:   20.0795,
    // S_OP_inf:          14.15,   Total_VSS_raw:  565.4983,
    // X_BPO_non_set_inf: 301,     Total_TSS_raw:  665.4983,
    // X_BPO_set_inf:     406,     Total_COD_set:  615,
    // X_UPO_non_set_inf: 20,      Total_C_set:    205.2029,
    // X_UPO_set_inf:     130,     Total_TKN_set:  71.8958,
    // X_iSS_raw_inf:     100,     Total_TP_set:   16.4455,
    // X_iSS_set_inf:     34,      Total_VSS_set:  211.1406,
    //                             Total_TSS_set:  245.1406 */
    //create 2 manual scenarios: (1) raw ww, (2) settled ww
    //syntax ------> constructor(Q,  S_VFA, S_FBSO, X_BPO, X_UPO, S_USO, X_iSS, S_FSA,  S_OP,  S_NOx)
    let sv = new State_Variables(25, 50,    186,    0,     0,     58,    0,     59.6,   14.15, 0);
    sv.set("X_BPO", 707); sv.set("X_UPO", 150); sv.set("X_iSS", 100); console.log(sv.summary);
    sv.set('X_BPO', 301); sv.set('X_UPO', 20);  sv.set('X_iSS', 34);  console.log(sv.summary);
  };
})();
