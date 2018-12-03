//resultats fraccionament lluís c.
Q      = 0.40896774;
S_VFA  = 30.1;
S_FBSO = 170.4;
X_BPO  = 191;
X_UPO  = 211.8;
S_USO  = 9.8;
X_iSS  = 30.2;
S_FSA  = 36.7;
S_OP   = 4.9;
S_NOx  = 1;

//inputs edar peralada
T            = 19;
Vp           = 829;
Rs           = 35.9;
RAS          = 1;
waste_from   = "sst";
SF           = 1.25;
fxt          = 0.4;
DO           = 1;
pH           = 7.2;
IR           = 40;
DO_RAS       = 1.0;
influent_alk = 250;
mass_FeCl3   = 20;

//url fase1
'http://localhost/ecoadvisor/tests/fase1.html?Q=0.40896774&S_VFA=30.1&S_FBSO=170.4&X_BPO=191&X_UPO=211.8&S_USO=9.8&X_iSS=30.2&S_FSA=36.7&S_OP=4.9&S_NOx=0&pst=false&fw=0.005&removal_BPO=42.3352&removal_UPO=90.0500&removal_iSS=75.1250&as=true&T=19&Vp=829&Rs=35.9&RAS=1.0&nit=false&SF=1.25&fxt=0.39&DO=1&pH=7.2&dn=false&IR=5.4&DO_RAS=1.0&influent_alk=250&cpr=false&mass_FeCl3=20&active=false&wb=25.88&wt=62.274&Db=18.458414&S=0.0010055&n=0.0358&Li=2000&Di=0.6&Ti=15&river_S_VFA=0&river_S_FBSO=0&river_X_BPO=0&river_X_UPO=0&river_S_USO=0&river_X_iSS=0&river_S_FSA=0&river_S_OP=0&river_S_NOx=0&NH4_R_20=0.0000005&NH4_k=1&PO4_R_20=0.0000005&PO4_k=1&waste_from=sst'

//url recomanador
'http://localhost/ecoadvisor/tests/recomanador.html?influent=[0.40896774,30.1,170.4,191,211.8,9.8,30.2,36.7,4.9,0]&tram=[25.880,62.274,18.45841,0.0010055,0.0358,2000,0.6,15]&conf={"pst":false,"nit":true,"dn":true,"cpr":true}&inputs={"fw":0.005,"removal_BPO":42.3352,"removal_UPO":90.0500,"removal_iSS":75.1250,"T":19,"Vp":829,"Rs":35.9,"RAS":1.0,"waste_from":"sst","mass_FeCl3":20,"SF":1.25,"fxt":0.39,"DO":1,"pH":7.2,"IR":5.4,"DO_RAS":1.0,"influent_alk":250}&deg={"R_20":{"NH4":0.0000005,"PO4":0.0000005},"k":{"NH4":1,"PO4":1}}&variacions={"Rs":[8,10,12,15,20,25,30,40],"RAS":[0.75,0.85,0.95,1.05,1.15,1.25],"DO":[1.00,1.50,2.00,2.50],"mass_FeCl3":[16,18,20,22,24]}'

/* vim: set wrap: */
