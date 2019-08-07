# gtd-analysis

<img width=200 src="https://africaopendata.org/uploads/group/2015-11-15-142410.774564GTD-logo.png"/>

#### Social data analysis and visualization of the [Global Terrorism Database](https://www.start.umd.edu/gtd/)
The database comprises of 150k incidents of terrorism around the globe.

The focus was on creating beautiful visualizations. Instead of producing static, boring charts, we managed to develop an interactive dashboard which enables every visitor of my website to explore the terrorism in the area of their interest. For this, we used d3.js, the state-of-the-art JavaScript library for building interactive charts. 

Highly encourage you to visit the [interactive website](https://polakowo.io/gtd-analysis/project/) and [explainer notebooks](https://nbviewer.jupyter.org/github/polakowo/socialdata2017/blob/master/project/jupyter/AssignmentProject-ExplainerNotebook.ipynb).

#### Motivation
The main motivation was producing beautiful and meaningful data visualizations. Here we followed a user-centric approach. For example, those who are interested in chemical weapons could in a few clicks retrieve the map showing the number of victims by country, or compare lethality of chemical weapons to that of explosives. 

#### Visualizations
- Histogram: 
  - Highlight temporal development of terrorism.
  - Example: *"How many terrorist attacks has Western Europe experienced in recent years?"*
- Scatterplot:
  - Compare different categories, such as weapon types, attack types and target groups.
  - Example: *"How do chemical weapons compare to explosives in terms of lethality?"*
- Choropleth map: 
  - Highlight geographical development of terrorism.
  - Created a time machine feature to animate how terrorism formed in each country of the years.
  - Example: *"What are the most dangerous regions for tourists?"*
- K-means clustering:
  - Cluster 150,000 terrorist attacks and identify their regional centers.
  - Example: *"What are regional clusters of armed assaults?"*
- K-nearest neighbors:
  - Classify any point on the map based on neighboring attacks.
  - Example: *"What is the most likely terrorist attack scenario for a given point on the map?"*
  
