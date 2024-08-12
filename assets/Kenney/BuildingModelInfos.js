/**
 * @typedef {{thumb: string, model: string}} ModelInfo
 */

/**
 * details about building models
 */
class BuildingModelInfos {

  /**
   *
   * @type {ModelInfo[[string, ModelInfo]]} list of building model infos
   */
  static MODEL_INFOS = [
    ['Type 01', {thumb: 'house_type01_SW.png', model: 'house_type01.glb'}],
    ['Type 02', {thumb: 'house_type02_SW.png', model: 'house_type02.glb'}],
    ['Type 03', {thumb: 'house_type03_SW.png', model: 'house_type03.glb'}],
    ['Type 04', {thumb: 'house_type04_SW.png', model: 'house_type04.glb'}],
    ['Type 05', {thumb: 'house_type05_SW.png', model: 'house_type05.glb'}],
    ['Type 06', {thumb: 'house_type06_SW.png', model: 'house_type06.glb'}],
    ['Type 07', {thumb: 'house_type07_SW.png', model: 'house_type07.glb'}],
    ['Type 08', {thumb: 'house_type08_SW.png', model: 'house_type08.glb'}],
    ['Type 09', {thumb: 'house_type09_SW.png', model: 'house_type09.glb'}],
    ['Type 10', {thumb: 'house_type10_SW.png', model: 'house_type10.glb'}],
    ['Type 11', {thumb: 'house_type11_SW.png', model: 'house_type11.glb'}],
    ['Type 12', {thumb: 'house_type12_SW.png', model: 'house_type12.glb'}],
    ['Type 13', {thumb: 'house_type13_SW.png', model: 'house_type13.glb'}],
    ['Type 14', {thumb: 'house_type14_SW.png', model: 'house_type14.glb'}],
    ['Type 15', {thumb: 'house_type15_SW.png', model: 'house_type15.glb'}],
    ['Type 16', {thumb: 'house_type16_SW.png', model: 'house_type16.glb'}],
    ['Type 17', {thumb: 'house_type17_SW.png', model: 'house_type17.glb'}],
    ['Type 18', {thumb: 'house_type18_SW.png', model: 'house_type18.glb'}],
    ['Type 19', {thumb: 'house_type19_SW.png', model: 'house_type19.glb'}],
    ['Type 20', {thumb: 'house_type20_SW.png', model: 'house_type20.glb'}],
    ['Type 21', {thumb: 'house_type21_SW.png', model: 'house_type21.glb'}]
  ];

  /**
   * @type {Map<string, ModelInfo>}
   */
  modelInfos;

  constructor() {

    this.modelInfos = new Map(BuildingModelInfos.MODEL_INFOS);

  }

}

export default new BuildingModelInfos();

