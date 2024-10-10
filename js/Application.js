/*
 Copyright 2022 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * Sausalito 1m Elevations
 *
 * https://www.sciencebase.gov/catalog/item/5e1fdff2e4b0ecf25c63a615
 * https://www.sciencebase.gov/catalog/item/5e1fdff2e4b0ecf25c63a617
 *
 */

const promiseUtils = await $arcgis.import("esri/core/promiseUtils");
const reactiveUtils = await $arcgis.import("esri/core/reactiveUtils");

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';
import ViewLoading from './apl/ViewLoading.js';
import MapScale from './apl/MapScale.js';

import buildingModelInfos from '../assets/Kenney/BuildingModelInfos.js';

class Application extends AppBase {

  /**
   * @type {Portal}
   */
  portal;

  /**
   *
   */
  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

        // STARTUP DIALOG //
        this.initializeStartupDialog();

        // VIEW SHAREABLE URL PARAMETERS //
        this.initializeViewShareable({view});

        // USER SIGN-IN //
        this.configUserSignIn();

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').toggleAttribute('hidden', true);
          //console.info("Application ready...");
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {

    const signInContainer = document.getElementById('sign-in-container');
    if (signInContainer) {
      const signIn = new SignIn({container: signInContainer, portal: this.portal});
    }

  }

  /**
   *
   * @param view
   */
  configView({view}) {
    return new Promise(async (resolve, reject) => {
      if (view) {

        // VIEW AND POPUP //
        const Popup = await $arcgis.import("esri/widgets/Popup");
        view.set({
          constraints: {snapToZoom: false}, popup: new Popup({
            dockEnabled: true, dockOptions: {
              buttonEnabled: false, breakpoint: false, position: "top-right"
            }
          })
        });

        // HOME //
        const Home = await $arcgis.import("esri/widgets/Home");
        const home = new Home({view});
        view.ui.add(home, {position: 'top-left', index: 0});

        // SEARCH //
        const Search = await $arcgis.import("esri/widgets/Search");
        const search = new Search({
          view: view,
          locationEnabled: false,
          popupEnabled: false,
          resultGraphicEnabled: false,
          searchTerm: '6 Bulkley Ave, Sausalito, California, 94965'
        });
        view.ui.add(search, {position: 'top-left', index: 0});

        reactiveUtils.on(() => search, 'search-complete', ({numResults, searchTerm, results}) => {
          //console.log(numResults, searchTerm, results);
          const result = results?.at(0)?.results?.at(0);
          if (result) {
            this.dispatchEvent(new CustomEvent('user-address-selected', {detail: {feature: result.feature}}));
          }
        });

        /*reactiveUtils.on(() => view, 'click', ({mapPoint}) => {
         search.search(mapPoint).then(results => {
         console.info(results);
         });
         });*/

        // COMPASS //
        const Compass = await $arcgis.import("esri/widgets/Compass");
        const compass = new Compass({view: view});
        view.ui.add(compass, {position: 'top-left', index: 2});
        reactiveUtils.watch(() => view.rotation, rotation => {
          compass.set({visible: (rotation > 0)});
        }, {initial: true});

        // MAP SCALE //
        const mapScale = new MapScale({view});
        view.ui.add(mapScale, {position: 'bottom-left', index: 0});

        // VIEW LOADING INDICATOR //
        const viewLoading = new ViewLoading({view: view});
        view.ui.add(viewLoading, 'bottom-right');

        // LAYER LIST //
        const LayerList = await $arcgis.import("esri/widgets/LayerList");
        const layerList = new LayerList({
          container: 'layers-container', view: view, visibleElements: {
            errors: true, statusIndicators: true
          }
        });

        // LEGEND //
        const Legend = await $arcgis.import("esri/widgets/Legend");
        const legend = new Legend({container: 'legend-container', view: view});
        //view.ui.add(legend, {position: 'bottom-left', index: 0});

        // BOOKMARKS //
        // const Bookmarks = await $arcgis.import("esri/widgets/Bookmarks");
        // const bookmarks = new Bookmarks({container: 'places-container', view: view});
        // const Expand = await $arcgis.import("esri/widgets/Expand");
        // const bookmarksExpand = new Expand({view: view,content:bookmarks,expanded:true});
        //view.ui.add(bookmarksExpand, {position: 'top-left', index: 0});

        resolve();

      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView({view}).then(async () => {

        const {existingView, proposedView} = await this.initializeImpactViews({view});
        await this.initializeAnalysis({view, existingView, proposedView});
        await this.initializeBuildingModelPlacement({view, existingView, proposedView});
        await this.initializeBuildingModelsList({view});

        resolve();
      }).catch(reject);
    });
  }

  /**
   *
   * @param view
   * @return {Promise<{existingView, proposedView}>}
   */
  async initializeImpactViews({view}) {

    const SceneView = await $arcgis.import("esri/views/SceneView");

    const existingView = new SceneView({
      container: 'existing-view-container',
      ui: {components: []},
      map: view.map
    });
    await existingView.when();

    const proposedView = new SceneView({
      container: 'proposed-view-container',
      ui: {components: []},
      map: view.map
    });
    await proposedView.when();

    return {existingView, proposedView};
  }

  /**
   *
   * @param view
   * @param existingView
   * @param proposedView
   * @return {Promise<void>}
   */
  async initializeAnalysis({view, existingView, proposedView}) {

    const viewshedsList = document.getElementById('viewsheds-list');

    const updateViewshedItem = ({viewshedItem, viewshed}) => {
      viewshedItem.setAttribute('description', `Lon: ${ viewshed.observer.longitude.toFixed(4) } Lat: ${ viewshed.observer.latitude.toFixed(4) }`);
    };

    const itemByViewshed = new Map();

    let viewshedCounter = 0;
    const addViewshedItem = ({viewshed, name}) => {
      const viewshedID = ++viewshedCounter;

      const viewshedItem = document.createElement('calcite-list-item');
      viewshedItem.setAttribute('label', name || `Viewshed #${ viewshedID }`);
      viewshedItem.toggleAttribute('closable', true);
      updateViewshedItem({viewshedItem, viewshed});
      viewshedsList.append(viewshedItem);

      viewshedItem.addEventListener('calciteListItemSelect', () => {
        analysisView.selectedViewshed = viewshed;
      });

      viewshedItem.addEventListener('calciteListItemClose', () => {
        itemByViewshed.delete(viewshed);
        viewshedAnalysis.viewsheds.splice(viewshedAnalysis.viewsheds.findIndex(v => v === viewshed), 1);
        viewshedItem.remove();
      });

      requestAnimationFrame(() => {
        viewshedItem.toggleAttribute('selected', true);
        analysisView.selectedViewshed = viewshed;
      });

      reactiveUtils.watch(() => viewshed.observer, () => {
        updateViewshedItem({viewshedItem, viewshed});
      });

      itemByViewshed.set(viewshed, viewshedItem);
    };

    const Viewshed = await $arcgis.import("esri/analysis/Viewshed");
    const ViewshedAnalysis = await $arcgis.import("esri/analysis/ViewshedAnalysis");
    const viewshedAnalysis = new ViewshedAnalysis({viewsheds: []});
    view.analyses.add(viewshedAnalysis);

    const analysisView = await view.whenAnalysisView(viewshedAnalysis);
    analysisView.interactive = true;

    const updateViews = () => {
      if (analysisView.selectedViewshed) {
        const {observer: position, heading, tilt} = analysisView.selectedViewshed;
        const goToParams = {position, heading, tilt};
        existingView.goTo(goToParams, {animate: false});
        proposedView.goTo(goToParams, {animate: false});
      }
    };

    reactiveUtils.watch(() => analysisView.selectedViewshed?.observer, () => { updateViews(); });
    reactiveUtils.watch(() => analysisView.selectedViewshed?.heading, () => { updateViews(); });
    reactiveUtils.watch(() => analysisView.selectedViewshed?.tilt, () => { updateViews(); });

    reactiveUtils.watch(() => analysisView.selectedViewshed, () => {
      if (analysisView.selectedViewshed) {
        const viewshedItem = itemByViewshed.get(analysisView.selectedViewshed);
        viewshedItem?.toggleAttribute('selected', true);
      } else {
        viewshedsList.querySelectorAll('calcite-list-item').forEach((item) => {
          item.toggleAttribute('selected', false);
        });
      }
      this.dispatchEvent(new CustomEvent('viewshed-selection-change', {detail: {hasSelectedViewshed: analysisView.selectedViewshed}}));
    });

    const geodesicUtils = await $arcgis.import("esri/geometry/support/geodesicUtils");
    const Point = await $arcgis.import("esri/geometry/Point");

    const getHeading = (location) => {
      const {azimuth} = geodesicUtils.geodesicDistance(
        new Point([location.longitude, location.latitude]),
        new Point([view.camera.position.longitude, view.camera.position.latitude]));
      return azimuth;
    };

    const _defaultObserverOffset = 1.6;
    const _defaultFarDistance = 150;
    const _defaultTilt = 85.0;
    const _defaultFOV = view.camera.fov;

    const _createViewshed = ({location, name}) => {

      const _observer = location.hasZ ? location.clone() : view.groundView.elevationSampler.queryElevation(location);
      _observer.z += _defaultObserverOffset;

      const viewshed = new Viewshed({
        observer: _observer,
        heading: getHeading(location),
        farDistance: _defaultFarDistance,
        tilt: _defaultTilt,
        horizontalFieldOfView: _defaultFOV,
        verticalFieldOfView: _defaultFOV
      });
      viewshedAnalysis.viewsheds.push(viewshed);

      addViewshedItem({viewshed, name});
    };

    let clickHandle;
    const viewshedAddBtn = document.getElementById('viewshed-add-btn');
    viewshedAddBtn.addEventListener('click', () => {
      const active = viewshedAddBtn.toggleAttribute('active');

      viewshedAddBtn.setAttribute('appearance', active ? 'solid' : 'outline-fill');
      view.container.style.cursor = active ? 'crosshair' : 'default';

      clickHandle?.remove();
      if (active) {
        this.dispatchEvent(new CustomEvent('viewshed-selection-change', {detail: {hasSelectedViewshed: true}}));

        clickHandle = reactiveUtils.on(() => view, 'click', clickEvt => {
          _createViewshed({location: clickEvt.mapPoint});
        });
      }

    });

    this.addEventListener('user-address-selected', ({detail: {feature}}) => {

      this.togglePanel('viewshed', true);

      _createViewshed({
        location: feature.geometry,
        name: feature.attributes.Match_addr
      });
    });

    this.addEventListener('building-update-start', ({detail: {}}) => {
      analysisView.selectedViewshed = null;
    });

    this.addEventListener('side-panel-change', ({detail: {toggleId, active}}) => {
      if (toggleId === 'viewshed' && active) {
        if (itemByViewshed.size === 1) {
          analysisView.selectedViewshed = itemByViewshed.keys().next().value;
        }
      }
    });

  }

  /**
   *
   * @param view
   * @param existingView
   * @param proposedView
   * @return {Promise<void>}
   */
  async initializeBuildingModelPlacement({view, existingView, proposedView}) {

    const initialSize = 10.0;

    const buildingsLayer = view.map.layers.find(l => l.title === 'Buildings');
    await buildingsLayer.load();

    const SceneFilter = await $arcgis.import("esri/layers/support/SceneFilter");
    const geometryEngine = await $arcgis.import("esri/geometry/geometryEngine");

    const updateBuildingsFilter = () => {

      const sketchAreas = sketchLayer.graphics.map((graphic) => {
        const location = graphic.geometry;
        const symbolLayer = graphic.symbol.symbolLayers.at(0);
        const {width, depth} = symbolLayer;
        const distance = (width && depth) ? Math.max(width, depth) : initialSize;
        return geometryEngine.geodesicBuffer(location, distance * 0.5, 'meters');
      });

      buildingsLayer.filter = new SceneFilter({
        geometries: sketchAreas,
        spatialRelationship: 'disjoint'
      });
    };

    const Graphic = await $arcgis.import("esri/Graphic");
    let sketchGraphic = new Graphic({
      geometry: {
        type: 'point',
        spatialReference: view.spatialReference,
        x: -13634342.551704712,
        y: 4558603.511751686,
        z: 2.192722893320024
      }
    });

    const GraphicsLayer = await $arcgis.import("esri/layers/GraphicsLayer");
    const sketchLayer = new GraphicsLayer({
      title: 'Sketch Layer',
      elevationInfo: {mode: 'relative-to-ground'},
      graphics: [sketchGraphic]
    });
    view.map.add(sketchLayer);

    sketchLayer.on('layerview-create', (evt) => {
      evt.layerView.visible = (evt.view !== existingView);
    });

    const SketchViewModel = await $arcgis.import("esri/widgets/Sketch/SketchViewModel");
    const sketchViewModel = new SketchViewModel({view: view, layer: sketchLayer});

    const ObjectSymbol3DLayer = await $arcgis.import("esri/symbols/ObjectSymbol3DLayer");

    this.addEventListener('model-selected', ({detail: {modelUrl}}) => {

      let buildingSymbolLayer;
      let buildingSymbol;

      if (sketchGraphic.symbol) {

        buildingSymbol = sketchGraphic.symbol.clone();
        buildingSymbolLayer = buildingSymbol.symbolLayers.at(0);
        buildingSymbolLayer.resource.href = modelUrl;

      } else {

        buildingSymbolLayer = new ObjectSymbol3DLayer({
          anchor: 'relative',
          anchorPosition: {x: 0, y: 0, z: -0.5},
          height: initialSize,
          resource: {href: modelUrl}
        });
        buildingSymbol = {
          type: "point-3d",
          symbolLayers: [buildingSymbolLayer]
        };

      }

      sketchGraphic.symbol = buildingSymbol;
      sketchViewModel.pointSymbol = buildingSymbol;
      sketchViewModel.update(sketchGraphic);
      updateBuildingsFilter();

    });

    this.addEventListener('side-panel-change', ({detail: {toggleId, active}}) => {
      if (toggleId === 'models' && active) {
        sketchViewModel.update(sketchGraphic);
        updateBuildingsFilter();
      } else {
        sketchViewModel.cancel();
      }
    });

    sketchViewModel.on("update", (event) => {
      if (event.state === "complete") {
        updateBuildingsFilter();
      } else {
        if (event.toolEventInfo && event.toolEventInfo.type.includes("stop")) {
          updateBuildingsFilter();
        }
      }
    });

    sketchViewModel.on("delete", (event) => {
      sketchGraphic = event.graphics.at(0).clone();
      sketchLayer.add(sketchGraphic);
      sketchViewModel.update(sketchGraphic);
      updateBuildingsFilter();
    });

    reactiveUtils.when(() => sketchViewModel.updateGraphics.length, () => {
      this.dispatchEvent(new CustomEvent('building-update-start', {detail: {}}));
    });

    this.addEventListener('viewshed-selection-change', ({detail: {hasSelectedViewshed}}) => {
      hasSelectedViewshed && sketchViewModel.cancel();
    });

  }

  /**
   *
   * @param view
   * @return {Promise<void>}
   */
  async initializeBuildingModelsList({view}) {

    const {
      THUMBNAIL_BASE_URL,
      MODEL_BASE_URL,
      modelInfos
    } = buildingModelInfos;

    const modelsList = document.getElementById('models-list');

    const modelSelected = ({model}) => {
      const modelUrl = `${ MODEL_BASE_URL }${ model }`;
      this.dispatchEvent(new CustomEvent('model-selected', {detail: {modelUrl}}));
    };

    modelInfos.forEach(({thumb, model}, key) => {

      const modelCard = document.createElement('calcite-card');
      modelCard.setAttribute('thumbnail-position', 'block-end');

      const heading = document.createElement('div');
      heading.innerText = key;
      heading.setAttribute('slot', 'heading');
      modelCard.appendChild(heading);

      const thumbnail = document.createElement('img');
      thumbnail.setAttribute('slot', 'thumbnail');
      thumbnail.setAttribute('src', `${ THUMBNAIL_BASE_URL }${ thumb }`);
      modelCard.append(thumbnail);

      modelCard.addEventListener('calciteCardSelect', () => {
        modelSelected({model});
      });

      if (key.includes('01')) {
        modelCard.toggleAttribute('selected', true);
        modelSelected({model});
      }

      modelsList.append(modelCard);
    });

  }

}

export default new Application();

