---
title: Adaptive Dashboard
year: 2026
type: HMI concept
role: [UX research, HMI design]
tools: [Figma, Miro]
duration: Concept project
summary: An instrument cluster that shows less as driving gets harder, and warns through one ring that changes colour.
category: HMI
cover: ../../assets/hmi/03-traffic-main.png
coverAlt: The traffic-mode cluster at night, with the speed ring in green, the car ahead and a mini map
coverRatio: 2 / 1
stats:
  - { value: 2, label: adaptive modes }
  - { value: 4, label: warning levels }
  - { value: 7, label: scenarios storyboarded }
  - { value: 12, label: final screens }
results:
  - Traffic mode drops the rev counter, so the busiest drive has the calmest screen
  - One colour ring ranks every warning, readable without reading
  - Only a critical event takes over the whole cluster
deliverables: [12 cluster screens, 7 storyboards, User and system flows, Layout sketches]
challenge:
  problem: Modern clusters show everything, all the time. Drivers check their speed constantly, miss alerts buried in clutter and look away from the road to find things.
  userGoals:
    - See speed and the next step at a glance
    - Notice a hazard before reading a word
    - Never dig through menus while driving
  systemGoals:
    - Show only what the road needs right now
    - Rank safety alerts above everything else
    - One cluster that adapts, not two products
  constraints:
    - No real vehicle data or sensors
    - Readable in a two-second glance
    - One fixed 1920 × 960 cluster screen
    - Warnings can never hide the speed
    - Concept work, not affiliated with Porsche
research:
  intent: Four questions, asked about how people drive, sorted into what matters on the highway and what matters in traffic.
  insights:
    - { title: Speed is checked constantly, text: "On highways, drivers glance at their speed every few seconds." }
    - { title: Priority moves with the road, text: "Navigation in new places, parking in tight spaces, ADAS at night." }
    - { title: Alerts get buried, text: "Too many notifications, and the important one gets lost." }
    - { title: Touch pulls eyes away, text: "Small targets and deep menus take attention off the road." }
  media:
    - { src: ../../assets/hmi/research.jpg, alt: "Miro wall of sticky notes under four research questions, with highway and traffic clusters, the brief and the scenarios", caption: "The research wall: four questions, then highway and traffic needs." }
    - { src: ../../assets/hmi/flows.jpg, alt: "User and system flowcharts for lane change, speed breaker and traffic mode", caption: "From sensor to screen: a flow for each scenario, with the points where a warning becomes an alert." }
exploration:
  - label: Storyboard
    caption: Seven moments, six shots each, from calm to safe.
    images:
      - { src: ../../assets/hmi/sb-blindspot.jpg, alt: "Storyboard: blind spot warning on the highway" }
      - { src: ../../assets/hmi/sb-exit.jpg, alt: "Storyboard: highway exit guidance" }
      - { src: ../../assets/hmi/sb-pedestrian.jpg, alt: "Storyboard: pedestrian crossing in traffic" }
      - { src: ../../assets/hmi/sb-parking.jpg, alt: "Storyboard: parking assist in traffic" }
  - label: Sketch
    caption: Three traffic and three highway layouts on paper, then four revised ones.
    images:
      - { src: ../../assets/hmi/sketches.jpg, alt: "Four hand-drawn cluster layouts with speed, rpm, range and status bars" }
  - label: Act it out
    caption: Toy cars on a paper road, warnings drawn where the screen would show them.
    images:
      - { src: ../../assets/hmi/toy-lane.jpg, alt: "Model car drifting toward the lane edge with warning arrows drawn beside it" }
      - { src: ../../assets/hmi/toy-change.jpg, alt: "Model car changing lanes with a green arrow showing it is clear" }
      - { src: ../../assets/hmi/toy-keep.jpg, alt: "Model car centred in its lane with green lane guides" }
      - { src: ../../assets/hmi/toy-park.jpg, alt: "Model car parking too close to another, with red sensor arcs" }
decisions:
  - title: Traffic mode drops the rev counter
    before: Early sketches kept speed and rpm side by side in both modes.
    after: In traffic the rpm gauge goes, and the map and 360° view take its place.
    why: Revs mean little at 20 km/h. Space is better spent on what is around the car.
    images:
      - { src: ../../assets/hmi/02-dashboard-main.png, alt: "Highway: speed and rpm" }
      - { src: ../../assets/hmi/03-traffic-main.png, alt: "Traffic: rpm removed" }
  - title: Warn with colour before words
    before: Research said pop-ups interrupt, and the important alert gets buried.
    after: The ring around the speed shifts green, yellow, orange, red.
    why: Colour reaches peripheral vision first, so the level is felt before any text is read.
    images:
      - { src: ../../assets/hmi/03-traffic-main.png, alt: Green · clear }
      - { src: ../../assets/hmi/06-blindspot-traffic.png, alt: Yellow · car alongside }
      - { src: ../../assets/hmi/07-proximity-warning.png, alt: Orange · closing in }
      - { src: ../../assets/hmi/08-proximity-alert.png, alt: Red · cut-in }
edgeCases:
  - { title: Emergency braking, text: "The whole cluster turns red with a single message. Nothing else competes.", src: ../../assets/hmi/12-crash-alert.png, alt: "The whole cluster washed red with the words Emergency Braking" }
  - { title: Pedestrian ahead, text: "A red cone points at the person, not just a generic warning.", src: ../../assets/hmi/09-proximity-alert-2.png, alt: "Pedestrian Detected warning with a red cone ahead of the car" }
  - { title: Reversing, text: "The cluster becomes the rear camera, with sensor arcs that go green, amber, red.", src: ../../assets/hmi/11-parking-manual.png, alt: "Rear camera view with guide lines next to a top-down car with sensor arcs" }
  - { title: Startup, text: "Every warning light checks itself once, then clears before driving.", src: ../../assets/hmi/01-startup.png, alt: "Startup screen with both gauges at zero and all warning lights on" }
retro:
  well:
    - Every screen traces back to a research question
    - One ring carries four warning levels
    - Toy-car runs made each scenario concrete before drawing
  hurdles:
    - Speed and range stay static across screens
    - Three storyboarded scenarios never reached a final screen
  next:
    - Screens for fatigue, speed breaker and motorcycle alerts
    - Sound and haptic cues paired with each ring colour
    - Glance tests with drivers in a simulator
blocks:
  - type: cluster
    ratio: 2 / 1
    modes:
      - name: Highway
        steps:
          - { src: ../../assets/hmi/01-startup.png, alt: Startup screen with both gauges at zero and all warning lights on, title: Startup, sensors: Self-check of every system., screen: Both gauges at zero, every tell-tale lit once. }
          - { src: ../../assets/hmi/02-dashboard-main.png, alt: Highway cruise at 94 km/h with speed and rpm gauges and a 120 limit sign, title: Cruise, sensors: Sign recognition and adaptive cruise., screen: "Speed, rpm, the limit and ACC 100. Nothing else." }
          - { src: ../../assets/hmi/04-nav-highway.png, alt: Navigation card reading Exit 12 in 2.4 km keep right, title: Exit guidance, sensors: GPS and lane data., screen: "Exit 12, 2.4 km, keep right, with the lane to take." }
          - { src: ../../assets/hmi/05-blindspot.png, alt: Yellow warning reading Vehicle Detected with the adjacent lane highlighted, title: Blind spot, sensors: Rear radar finds a car alongside., screen: The lane lights up yellow before you move into it. }
          - { src: ../../assets/hmi/12-crash-alert.png, alt: The whole cluster washed red with the words Emergency Braking, title: Emergency braking, sensors: Forward camera and radar predict a collision., screen: The whole cluster turns red. One message. }
      - name: Traffic
        steps:
          - { src: ../../assets/hmi/03-traffic-main.png, alt: Traffic mode with the rpm gauge removed and a green speed ring, title: Traffic mode, sensors: "360° proximity on.", screen: "The rpm gauge goes. Map, range and a green ring stay." }
          - { src: ../../assets/hmi/06-blindspot-traffic.png, alt: Speed ring turned yellow with a car behind on the left, title: Car alongside, sensors: Side sensors track a car close behind., screen: The ring turns yellow. }
          - { src: ../../assets/hmi/07-proximity-warning.png, alt: Speed ring turned orange with cars close on every side, title: Closing in, sensors: Gaps shrinking on several sides., screen: Ring and halo turn orange. }
          - { src: ../../assets/hmi/08-proximity-alert.png, alt: Red ring and a red lane with a warning sign as a car cuts in, title: Cut-in, sensors: A car enters your lane., screen: "Red ring, red lane, WARNING." }
          - { src: ../../assets/hmi/09-proximity-alert-2.png, alt: Pedestrian Detected warning with a red cone ahead of the car, title: Pedestrian, sensors: Camera classifies a person crossing., screen: Pedestrian Detected and a red cone ahead. }
      - name: Parking
        steps:
          - { src: ../../assets/hmi/10-park-auto.png, alt: A free space highlighted green beside the car with a Confirm OK prompt, title: Auto park, sensors: Ultrasonics find a free space., screen: "The space glows green. One tap: Confirm, OK." }
          - { src: ../../assets/hmi/11-parking-manual.png, alt: Rear camera view with guide lines next to a top-down car with sensor arcs, title: Manual park, sensors: Rear camera and twelve sensors., screen: "Camera, guide lines and arcs that go green, amber, red." }
featured: true
order: 2
---

## Overview
- A concept instrument cluster that adapts to the road.
- Concept work; not affiliated with Porsche.

## Problem
- Too much information, too many notifications, small targets and text.
- Important alerts get buried; drivers look away to find things.

## Research
- Four questions, answered on a Miro wall.
- Core needs: speed, navigation, blind spot, range.
- Context changes priority: navigation in new places, parking in tight spaces, speed on highways, ADAS at night.

## Design principles
- Context first, progressive disclosure, large type and targets.
- Safety alerts ranked above everything; minimal motion.

## What's next
- Fatigue alert, speed-breaker lift and motorcycle warning screens.
- Sound and haptic cues to pair with each alert level.
- Testing with drivers in a simulator.
