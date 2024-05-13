<p>
    For our design, we wanted to keep the central part of our visualization easy to digest. Therefore, the rapidly updating bars, representing countries, each with a unique color, and are sorted by length/unit amount (e.g if the user selects “population,” the bars will be sorted by population), and have lengths representative of their relative sizes.
</p>

<p>
    Another interactive element in our visualization are the customizable queries, allowing for top country numbers, time period, and statistics (population, GDP, etc.) selection. Allowing users to select these from a drop-down menu seemed the most convenient way for users to interact with the model without too much cluttering on screen. Lastly, interesting statistics/facts on the top countries visible to the user would appear corresponding to their year. For example, if the user selected the “Population” statistic from 2000 to 2022, they would see that the Wenzhou Train Collision happened in China in 2011 when the statistic updates to that point.
</p>

<p>
    When brainstorming on how to display the live model, our chosen visualization took inspiration from Youtube videos displaying rapidly updating company net worths spanning a couple of years (with some overtaking others frequently). Because this is a timeline-based visualization, we also considered using something like a dynamic pie-chart that would update slowly throughout the time period (like our country-bar representation), but due to the possibility of the amount of selected countries being very high, the visualization would end up cluttered due to the limitations of a pie chart.
</p>

<p>
    In total, the project took 15 hours across both team members. Brendan finished the styling/model polishing while Allen was doing the actual data visualization portion along with the user queries. The most difficult portion of this project was when Allen was trying to get the bars to race properly with nice interpolation.
</p>

<style>
    * {
        font-family: "JetBrains Mono", serif;
    }
</style>