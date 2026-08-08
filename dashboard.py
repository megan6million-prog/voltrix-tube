from datetime import datetime
import os
import time
import random

def read_temp():
    return round(random.uniform(20.0, 110.0), 1)

def read_light():
    return random.randint(1, 100)
def run_fan():
    t = int(read_temp())
    n = 30.0
    if t < 30:
        v = 0
        print(f"temp is {t}: fan off, thermostat on.")
        print(f"fan speed: {0}")
    if t < 50:
        v = random.randint(30, 40)
        print(f"temp is {t}, {t - n} degrees abone nornal: fan on.")
        print(f"fan speed: {v}")
    if t < 70:
        v = random.randint(40, 59)
        print(f"temp is {t}, {t - n}(hot) degrees abone nornal: 2 fans on.")
        print(f"fan speed: {v}")
    elif t < 100:
        v = 100
        print(f"temp is {t}, {100 - t} degrees to 100 degrees: All fans on. Rest in peace.")
        print(f"{v}")
    else:
        v = random.randint(100, 105)
        print(f"temp is {t - 100} degrees above boiling point: calling 911")
        print(f"fan speed: \n {v}",  flush=True )
        sleep(1)
        for b in range(3):
            print( "\n beep", end="", flush=True)
            time.sleep(1)
        print("Rest In Peace")


#def read_motion():
#   return choice([True, False])
#   if choice == True
        
for r in range(50):
    read_temp()
    time.sleep(3)
    run_fan()
