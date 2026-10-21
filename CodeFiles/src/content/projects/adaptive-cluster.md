---
title: Adaptive Cluster
year: 2026
type: HMI concept
role: [UX research, HMI design, Prototyping]
tools: [Figma, Miro]
duration: To confirm
summary: An instrument cluster that changes with the drive, calm on the highway, close-quarters in traffic, with alerts only when they matter.
category: HMI
cover: ../../assets/projects/adaptive-cluster/screens/dashboard.png
coverAlt: "The cluster in highway mode: 94 km/h and 1,500 r/min on two dials, the car centred on a night road."
coverRatio: 2 / 1
preview: /video/adaptive-cluster-loop.mp4
blocks:
  - { type: video, after: Outcome, src: /video/adaptive-cluster.mp4, poster: ../../assets/projects/adaptive-cluster/film-poster.jpg, alt: "Film of the cluster in use: start-up, exit guidance, blind spot, traffic mode, proximity, pedestrian, park assist and emergency braking.", ratio: 16 / 9 }
  - type: cluster
    after: Outcome
    modes:
      - name: Highway
        steps:
          - { src: ../../assets/projects/adaptive-cluster/screens/startup.png, alt: "Start-up screen with both dials at zero.", title: Start-up, screen: "The cluster wakes with both dials at zero and the car at the centre of the road." }
          - { src: ../../assets/projects/adaptive-cluster/screens/dashboard.png, alt: "Highway mode at 94 km/h with the speed limit and adaptive cruise shown.", title: Cruising, screen: "Speed, revs, the posted limit and adaptive cruise. Nothing else competes for a glance." }
          - { src: ../../assets/projects/adaptive-cluster/screens/nav-highway.png, alt: "An exit card reading Exit 12, 2.4 km, keep right.", title: Exit guidance, sensors: "GPS tracks the car's position, the exit distance is calculated and the lane you need is worked out.", screen: "An exit card appears early with a distance countdown and the lane to take." }
          - { src: ../../assets/projects/adaptive-cluster/screens/blindspot.png, alt: "A warning triangle, Vehicle Detected, with the left lane shaded amber.", title: Blind spot, sensors: "The indicator goes on, side radar scans the next lane and finds a vehicle in the blind-spot zone.", screen: "A warning lights up and the lane you're moving into turns amber." }
          - { src: ../../assets/projects/adaptive-cluster/screens/crash.png, alt: "The whole cluster tinted red with an Emergency Braking warning.", title: Emergency braking, sensors: "Radar and camera track the car ahead, time to collision drops past the threshold and the brakes are applied.", screen: "The whole cluster turns red: emergency braking, impossible to miss." }
      - name: Traffic
        steps:
          - { src: ../../assets/projects/adaptive-cluster/screens/traffic.png, alt: "Traffic mode with a green speed ring and a live map on the right.", title: Traffic mode, screen: "The rev dial gives way to a live map, and a proximity ring surrounds the car." }
          - { src: ../../assets/projects/adaptive-cluster/screens/proximity-warning.png, alt: "The speed ring turns orange as a car ahead gets close.", title: Closing in, sensors: "Forward radar picks up the car ahead and the gap keeps shrinking.", screen: "The car ahead is highlighted and the speed ring warms to amber." }
          - { src: ../../assets/projects/adaptive-cluster/screens/proximity-alert.png, alt: "A red speed ring, a warning triangle and a red zone next to the car.", title: Proximity alert, sensors: "Collision risk is evaluated against speed and distance.", screen: "The ring and the danger zone turn red, with a warning card." }
          - { src: ../../assets/projects/adaptive-cluster/screens/blindspot-traffic.png, alt: "A vehicle outline highlighted in the left lane with a warning.", title: Blind spot in traffic, sensors: "Side radar scans the adjacent lanes while the indicator is on.", screen: "The other vehicle's outline appears beside your own car." }
          - { src: ../../assets/projects/adaptive-cluster/screens/pedestrian.png, alt: "Pedestrian Detected warning with a red zone ahead of the car.", title: Pedestrian, sensors: "The camera classifies a pedestrian ahead.", screen: "The zone in front of the car turns red with a Pedestrian Detected warning." }
          - { src: ../../assets/projects/adaptive-cluster/screens/park-auto.png, alt: "A parking space highlighted green with a Confirm prompt.", title: Park assist, sensors: "Cameras and ultrasonic sensors measure the gaps and find a space that fits.", screen: "The space is highlighted with one prompt: confirm, and the car parks itself." }
          - { src: ../../assets/projects/adaptive-cluster/screens/park-manual.png, alt: "A top-down car view with distance arcs beside a rear camera feed with guide lines.", title: Manual parking, sensors: "Ultrasonic sensors measure the clearance on every side.", screen: "Camera feed with guide lines, and distance arcs around a top-down view of the car." }
  - { type: quote, after: Research, text: "Important alerts get buried.", cite: Research finding }
  - { type: full, after: Sensor to screen, src: ../../assets/projects/adaptive-cluster/process-mapping.png, alt: "A board of sticky notes in two halves, frontend and backend, one column per feature, beside hand-drawn screen wireframes.", ratio: 1575 / 495, caption: Frontend against backend for five features, next to the first screen wireframes. }
  - { type: full, after: Prototyping, src: ../../assets/projects/adaptive-cluster/process-tabletop.png, alt: "Toy cars on paper lanes with arrows drawn on, beside a hand sketch of exit-guidance screens.", ratio: 1250 / 675, caption: "Highway exit guidance, acted out with toy cars, then sketched beat by beat." }
  - type: two
    after: Layouts
    items:
      - { src: ../../assets/projects/adaptive-cluster/wireframe-a.png, alt: "Layout A: speed and rpm dials either side of a top-down lane view, with battery, range, tyre pressure and drive modes.", ratio: 2 / 1, caption: "A. Vitals around a top-down lane view." }
      - { src: ../../assets/projects/adaptive-cluster/wireframe-b.png, alt: "Layout B: large speed and rpm panels either side of the road, with a strip for blind spot, lane keep, ACC, range and speed limit.", ratio: 2 / 1, caption: "B. A strip of driver-assist states." }
  - type: two
    after: Layouts
    items:
      - { src: ../../assets/projects/adaptive-cluster/wireframe-c.png, alt: "Layout C: an Exit 12 banner across the top, speed in an arch over the road, range and rpm bars at the sides.", ratio: 2 / 1, caption: "C. Exit banner, speed in an arch." }
      - { src: ../../assets/projects/adaptive-cluster/wireframe-d.png, alt: "Layout D: a wraparound arc of lights framing the road, with speed and range inside it.", ratio: 2 / 1, caption: "D. A wraparound arc of lights." }
featured: true
order: 1
---

## Outcome
A two-mode instrument cluster, from start-up to emergency braking and automatic parking. Every warning was designed from the sensor up: what the car detects, what it decides, and the one thing the driver needs to see at that moment.

## Research
The research question: how might a car's interface adapt what it shows, and how much it asks of the driver, to reduce cognitive overload without giving up safety?

I organised the research around four questions: what matters most while driving, how that changes from one situation to another, which interactions distract the most, and what would take effort away.

Priorities turned out to depend on context. Navigation matters in unfamiliar areas, cameras in tight spaces, blind-spot alerts on the highway and driver assistance at night. The worst distractions were touchscreen climate controls, typing a destination, pop-ups covering the navigation, and too many notifications at once.

## Two modes
That led to a brief with two modes. **Highway** keeps speed and the limit constantly visible, adds range for long drives, exit guidance, lane keeping, blind-spot and fatigue monitoring. **Traffic** brings proximity and collision alerts, pedestrians, congestion updates, start-stop status, quick climate and parking cameras.

One feature goes beyond the usual cluster: when the cameras spot a speed breaker or a bad patch of road, the suspension lifts the front of the car to protect the underbody, and the cluster shows it happening.

## Sensor to screen
For five features (blind spot warning, emergency braking, parking assist, highway exit guidance and the suspension lift) I mapped the backend against the frontend step by step: what the radar, cameras and GPS pick up, what the system decides, and what appears on the cluster at each moment. That mapping set the order, timing and priority of every alert.

## Prototyping
Before drawing a single screen, I acted the scenarios out on a tabletop with toy cars and drawn lanes, then sketched what the cluster should show at each beat. For exit guidance: the card appears early, the distance counts down, and the lane guidance widens as the exit gets closer.

## Layouts
Wireframes for each mode came first, then four revised layouts, redrawn here from my sketches: a highway and traffic toggle with drive modes, speed and revs with an assistance strip, an exit banner over a central arch, and a wraparound arc. The final design keeps two large dials, puts the car at the centre of the road view, and places each alert where the hazard actually is.
