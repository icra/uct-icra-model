/**
  * Removal % of the particulated fractions of COD, TKN (ON), TP (OP), TSS (biodeg + nonbiodeg)
  *
  */
function primary_settler(Q,bpCOD,nbpCOD,iTSS,ON,OP,VSS_COD,bpCOD_bVSS,removal_bpCOD,removal_nbpCOD,removal_iTSS,removal_ON,removal_OP){
  /*
    |  Inputs          |  example values   | comments
    |------------------+-------------------+----------------------
    |  Q               |  22700    m3/d    | flowrate
    |  bpCOD           |    112    g/m3    | biodegradable   particulate COD (BPO)
    |  nbpCOD          |     56    g/m3    | unbiodegradable particulate COD (UPO)
    |  iTSS            |     10    g/m3    | inert solids (sand)
    |  ON              |     10    g/m3    | organic N (TKN-NH4)
    |  OP              |      1    g/m3    | organic P (TP-PO4)
    |  VSS_COD         |    2.8    g/m3    | pCOD/VSS
    |  bpCOD_bVSS      |    2.8    g/m3    | bpCOD/bVSS
    |  removal_bpCOD   |     40       %    | removal of BPO (biodegradable particulate organics)
    |  removal_nbpCOD  |     60       %    | removal of UPO (unbiodegradable particulate organics)
    |  removal_iTSS    |     70       %    | removal of inerts
    |  removal_ON      |     66       %    | removal of organic N
    |  removal_OP      |     66       %    | removal of organic P
    |------------------+-------------------+----------------------
  */

  //apply removal rates
  var bpCOD_removed    = 0.01*removal_bpCOD  * bpCOD;              //g/m3
  var nbpCOD_removed   = 0.01*removal_nbpCOD * nbpCOD;             //g/m3
  var pCOD_removed     = bpCOD_removed + nbpCOD_removed;           //g/m3
  var pCOD_removed_kgd = Q*pCOD_removed/1000;                      //kg/d
  var ON_removed       = 0.01*removal_ON * ON;                     //g/m3
  var OP_removed       = 0.01*removal_OP * OP;                     //g/m3
  var iTSS_removed     = 0.01*removal_iTSS * iTSS;                 //g/m3
  var VSS_removed      = VSS_COD==0? 0 : pCOD_removed/VSS_COD;     //g/m3
  var TSS_removed      = VSS_removed + iTSS_removed;               //g/m3
  var bVSS_removed     = VSS_COD==0? 0 : bpCOD_removed/bpCOD_bVSS; //g/m3
  var nbVSS_removed    = VSS_removed - bVSS_removed;               //g/m3
  var VSS_removed_kgd  = Q*VSS_removed/1000;                       //kg/d
  var TSS_removed_kgd  = Q*TSS_removed/1000;                       //kg/d

  /*
    George Ekama mail:
    I suggest that for the municipal wastewater:
    Settled WW TKN = (TKN – NH4)/3 + NH4
    Settled WW TP  = (TP  – PO4)/3 + PO4
    And PO4 =  Ortho phosphate concetration (PO4 is dissolved and so is the same in raw and settled WW).
    This approach assumes that 2/3rd of the raw WW Org N (TKN minus NH4) and
    2/3rd of the raw WW Org P (TP minus OP) are removed by the PST.
  */

  return {
    bpCOD_removed:      {value:bpCOD_removed,         unit:"g/m3_as_O2", descr:"Removed_bpCOD_by_primary_settler"},
    bpCOD_removed_kgd:  {value:Q*bpCOD_removed/1000,  unit:"kg/d_as_O2", descr:"Removed_bpCOD_by_primary_settler"},
    nbpCOD_removed:     {value:nbpCOD_removed,        unit:"g/m3_as_O2", descr:"Removed_nbpCOD_by_primary_settler"},
    nbpCOD_removed_kgd: {value:Q*nbpCOD_removed/1000, unit:"kg/d_as_O2", descr:"Removed_nbpCOD_by_primary_settler"},
    pCOD_removed:       {value:pCOD_removed,          unit:"g/m3_as_O2", descr:"Removed_pCOD_by_primary_settler"},
    pCOD_removed_kgd:   {value:Q*pCOD_removed/1000,   unit:"kg/d_as_O2", descr:"Removed_pCOD_by_primary_settler"},
    ON_removed:         {value:ON_removed,            unit:"g/m3_as_N",  descr:"Removed_Organic_Nitrogen_by_primary_settler"},
    ON_removed_kgd:     {value:Q*ON_removed/1000,     unit:"kg/d_as_N",  descr:"Removed_Organic_Nitrogen_by_primary_settler"},
    OP_removed:         {value:OP_removed,            unit:"g/m3_as_P",  descr:"Removed_Organic_Phosphorus_by_primary_settler"},
    OP_removed_kgd:     {value:Q*OP_removed/1000,     unit:"kg/d_as_P",  descr:"Removed_Organic_Phosphorus_by_primary_settler"},
    iTSS_removed:       {value:iTSS_removed,          unit:"g/m3",       descr:"Removed_iTSS_by_primary_settler"},
    iTSS_removed_kgd:   {value:Q*iTSS_removed/1000,   unit:"kg/d",       descr:"Removed_iTSS_by_primary_settler"},
    VSS_removed:        {value:VSS_removed,           unit:"g/m3",       descr:"Removed_VSS_by_primary_settler"},
    VSS_removed_kgd:    {value:Q*VSS_removed/1000,    unit:"kg/d",       descr:"Removed_VSS_by_primary_settler"},
    TSS_removed:        {value:TSS_removed,           unit:"g/m3",       descr:"Removed_TSS_by_primary_settler"},
    TSS_removed_kgd:    {value:Q*TSS_removed/1000,    unit:"kg/d",       descr:"Removed_TSS_by_primary_settler"},
    nbVSS_removed:      {value:nbVSS_removed,         unit:"g/m3",       descr:"Removed_nbVSS_by_primary_settler"},
    nbVSS_removed_kgd:  {value:Q*nbVSS_removed/1000,  unit:"kg/d",       descr:"Removed_nbVSS_by_primary_settler"},
    bVSS_removed:       {value:bVSS_removed,          unit:"g/m3",       descr:"Removed_bVSS_by_primary_settler"},
    bVSS_removed_kgd:   {value:Q*bVSS_removed/1000,   unit:"kg/d",       descr:"Removed_bVSS_by_primary_settler"},
  }
}

/*testing function*/
(function(){
  var debug=false;
  var debug=true;
  if(debug==false)return;
  var Q              = 22700;
  var bpCOD          = 112;
  var nbpCOD         = 56;
  var iTSS           = 10;
  var ON             = 10;
  var OP             = 1;
  var VSS_COD        = 2.8;
  var bpCOD_bVSS     = 2.8;
  var removal_bpCOD  = 40;
  var removal_nbpCOD = 60;
  var removal_iTSS   = 70;
  var removal_ON     = 66;
  var removal_OP     = 66;
  console.log(
    primary_settler(Q,bpCOD,nbpCOD,iTSS,ON,OP,VSS_COD,bpCOD_bVSS,removal_bpCOD,removal_nbpCOD,removal_iTSS,removal_ON,removal_OP)
  );
})();
