'''
ASM1 implementation and example with initial data
@author Lluis Bosch (lbosch@icra.cat)
Created  04/02/2014 | Modified 12/12/2018 
'''
import numpy as np                  # array()
from scipy.integrate import odeint  # function odeint(f,y0,t) to integrate ODEs
import matplotlib.pyplot as plt     # function for plotting
plt.ion()                           # turn interactive mode on

##################################################################################
# Stoichiometric & Kinetic Parameters (20 ºC), as in page 9 of ASM1 description) #
##################################################################################
YH     = 0.67  # Heterotrophic yield
YA     = 0.24  # Autotrophic yield
FP     = 0.08  # Fraction of biomass yielding particulate products
iXB    = 0.086 # Mass N / Mass COD in biomass
iXP    = 0.06  # Mass N / Mass COD in products from biomass
MuMaxH = 6     # Heterotrophic max specific growth rate
bH     = 0.62  # Heterotrophic decay rate
KS     = 20    # Half-saturation coef for heterotrophs
KOH    = 0.20  # Oxygen half saturation coef for heterotrophs
KNO    = 0.50  # Nitrate half saturation coef
MuMaxA = 0.80  # Autotrophic max specific growth rate
bA     = 0.20  # Autotrophic decay rate
KOA    = 0.4   # Oxygen  half saturation coef for autotrophs
KNH    = 1.0   # Ammonia half saturation coef for autotrophs
nG     = 0.8   # Correction factor for anoxic growth of heterotrophs
ka     = 0.08  # Ammonification rate
kh     = 3.0   # Max specific hydrolisis rate
KX     = 0.03  # Half saturation coef for hydrolysis of slowly biodeg. substrate
nh     = 0.4   # Correction factor for anoxic hydrolysis
kla    = 20    # Coeficient de transf oxigen
SO_sat = 8     # Valor de saturacio de oxigen

# Solve the system dy/dt = f(y,t)
# array of expressions to integrate
def f(y,t):
  #########################################################
  # STATE VARIABLES: Total COD, Total Nitrogen and Oxygen #
  #########################################################
  XBH = y[0]  # Active mass COD Heterotrophs              | OHO
  XBA = y[1]  # Active mass COD Autotrophs                | ANO
  Ss  = y[2]  # Biodegradable COD Soluble                 | BSO (VFA+FBSO)
  Xs  = y[3]  # Biodegradable COD Particulate             | BPO
  XP  = y[4]  # Nonbiodegradable COD Particulate          | UPO
  XND = y[5]  # Particulate organic N Biodegradable N     | bpON
  SND = y[6]  # Soluble organic N Biodegradable N         | bsON   
  SNH = y[7]  # Free & Saline Ammonia                     | NH4/FSA
  SNO = y[8]  # Nitrate and Nitrite N                     | NOx
  SO  = y[9]  # Dissolved Oxygen Concentration            | DO

  ########
  # ODEs #
  ########
  # (1) dXBH/dt
  eq1  = (MuMaxH*(Ss/(KS+Ss))*((SO/(KOH+SO))+nG*(KOH/(KOH+SO))*(SNO/(KNO+SNO)))-bH)*XBH 
  # (2) dXBA/dt
  eq2  = (MuMaxA*(SNH/(KNH+SNH))*(SO/(KOA+SO))-bA)*XBA 
  # (3) dSs/dt
  eq3  = ((-MuMaxH/YH)*(Ss/(KS+Ss))*((SO/(KOH+SO))+nG*(KOH/(KOH+SO))*(SNO/(KNO+SNO)))+kh*(Xs/XBH)/(KX+Xs/XBH)*((SO/(KOH+SO))+nh*(KOH/(KOH+SO))*(SNO/(KNO+SNO))))*XBH  
  # (4) dXs/dt
  eq4  = (1-FP)*(bH*XBH+bA*XBA)-kh*(Xs/XBH)/(KX+Xs/XBH)*((SO/(KOH+SO))+nh*(KOH/(KOH+SO))*(SNO/(KNO+SNO)))*XBH 
  # (5) dXP/dt
  eq5  = FP*(bH*XBH+bA*XBA) 
  # (6) dXND/dt
  eq6  = (iXB-FP*iXP)*(bH*XBH+bA*XBA)-kh*(XND/XBH)/(KX+Xs/XBH)*((SO/(KOH+SO))+nh*(KOH/(KOH+SO))*(SNO/(KNO+SNO)))*XBH 
  # (7) dSND/dt
  eq7  = (-ka*SND+kh*(XND/XBH)/(KX+Xs/XBH)*((SO/(KOH+SO))+nh*(KOH/(KOH+SO))*(SNO/(KNO+SNO))))*XBH 
  # (8) dSNH/dt
  eq8  = (-iXB*MuMaxH*(Ss/(KS+Ss))*((SO/(KOH+SO))+nG*(KOH/(KOH+SO))*(SNO/(KNO+SNO)))+ka*SND)*XBH-MuMaxA*(iXB+(1/YA))*(SNH/(KNH+SNH))*(SO/(KOA+SO))*XBA 
  # (9) dSNO/dt
  eq9  = -MuMaxH*nG*((1-YH)/(2.86*YH))*(Ss/(KS+Ss))*(KOH/(KOH+SO))*(SNO/(KNO+SNO))*XBH+(MuMaxA/YA)*(SNH/(KNH+SNH))*(SO/(KOA+SO))*XBA 
  # (10) dSO/dt
  eq10 = -MuMaxH*((1-YH)/YH)*(Ss/(KS+Ss))*(SO/(KOH+SO))*XBH-MuMaxA*((4.57-YA)/YA)*(SNH/(KNH+SNH))*(SO/(KOA+SO))*XBA
  #separar
  eq10 = eq10+kla*(SO_sat-SO) 

  # retorna les eq diferencials
  return [eq1,eq2,eq3,eq4,eq5,eq6,eq7,eq8,eq9,eq10]

######################
# INITIAL CONDITIONS #
######################
XBH_0 = 1      # Active mass COD Heterotrophs
XBA_0 = 1      # Active mass COD Autotrophs
Ss_0  = 165    # Biodegradable COD Soluble (VFA + FBSO)
Xs_0  = 255    # Biodegradable COD Particulate
XP_0  = 10     # Nonbiodegradable COD Particulate
XND_0 = 5.4081 # Particulate organic N Biodegradable N (SND & XND)
SND_0 = 3.7577 # Soluble organic N Biodegradable N (SND & XND)
SNH_0 = 39.1   # Free & Saline Ammonia
SNO_0 = 0      # Nitrate and Nitrite N
SO_0  = 2.0    # Dissolved Oxygen Concentration

# Array of initial conditions (order matters)
y0 = [XBH_0, XBA_0, Ss_0, Xs_0, XP_0, XND_0, SND_0, SNH_0, SNO_0, SO_0]

# Time = 35 days
t = np.linspace(0,35,3501)

# Solve ODEs
solutions = odeint(f,y0,t)

#arrays
XBH = solutions[:,0] # Active mass COD Heterotrophs
XBA = solutions[:,1] # Active mass COD Autotrophs
Ss  = solutions[:,2] # Biodegradable COD Soluble
Xs  = solutions[:,3] # Biodegradable COD Particulate
XP  = solutions[:,4] # Nonbiodegradable COD Particulate
XND = solutions[:,5] # Particulate organic N Biodegradable N (SND & XND)
SND = solutions[:,6] # Soluble organic N Biodegradable N (SND & XND)
SNH = solutions[:,7] # Free & Saline Ammonia
SNO = solutions[:,8] # Nitrate and Nitrite N
SO  = solutions[:,9] # Dissolved Oxygen Concentration

# New plot
plt.figure()
plt.xlabel('Time (d)')
plt.ylabel('Concentration (mg/L)')
plt.title('ASM1 simulation')
plt.legend(loc=0)
plt.plot(t, XBH,  label='Active mass COD Heterotrophs')
plt.plot(t, XBA,  label='Active mass COD Autotrophs')
plt.plot(t, Ss,   label='Biodegradable COD Soluble')
plt.plot(t, Xs,   label='Biodegradable COD Particulate')
plt.plot(t, XP,   label='Nonbiodegradable COD Particulate')
plt.plot(t, XND,  label='Particulate organic Biodegradable N')
plt.plot(t, SND,  label='Soluble organic Biodegradable N')
plt.plot(t, SNH,  label='Free & Saline Ammonia')
plt.plot(t, SNO,  label='Nitrate and Nitrite N')
plt.plot(t, SO  , label='Dissolved Oxygen Concentration')

#end program
raw_input("Enter to exit")
