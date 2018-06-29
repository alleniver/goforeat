import React, { Component } from "react";
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  AppState,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import {
  Container,
  Header,
} from "native-base";
import Carousel from "react-native-snap-carousel";
import LinearGradient from 'react-native-linear-gradient';
import { sliderWidth, itemWidth } from "../styles/SliderEntry.style";
import SliderEntry from "../components/SliderEntry";
import HotReloadHOC from '../components/HotReloadHOC';
//styles
import styles, { colors } from "../styles/index.style";
import HomePageStyles from "../styles/homepage.style";
// utils
import Colors from "../utils/Colors";
import GLOBAL_PARAMS from "../utils/global_params";
//api
import api from "../api";
//components
import ErrorPage from "../components/ErrorPage";
import Loading from "../components/Loading";
import PlacePickerModel from '../components/PlacePickerModel';
import BlankPage from '../components/BlankPage';
import BottomOrderConfirm from '../components/BottomOrderConfirm';
import WarningTips from '../components/WarningTips';
//language
import i18n from "../language/i18n";

const SLIDER_1_FIRST_ITEM = 0;

class HomePage extends Component {
  _current_offset = 0;
  _SliderEntry = null;
  _timer = null;
  _picker = null;
  constructor(props) {
    super(props);
    this.state = {
      slider1ActiveSlide: SLIDER_1_FIRST_ITEM,
      shopDetail: null,
      foodDetails: null,
      isError: false,
      loading: false,
      refreshing: false,
      i18n: i18n[this.props.screenProps.language],
      placeSelected: null,
      formatDate: {
        date: '',
        week: '',
        endDate: ''
      },
      refreshParams: '',
      isBottomContainerShow: false,
      foodCount: 0,
      showPlacePicker: false
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      i18n: i18n[nextProps.screenProps.language]
    });
    if(!this.state.isBottomContainerShow&&(nextProps.screenProps.refresh != this.state.refreshParams)&&nextProps.screenProps.refresh!= null) {
      this._reloadPage();
    }
    this.setState({refreshParams: nextProps.screenProps.refresh})
  }

  componentDidMount() {
    AppState.addEventListener('change', (nextAppState) =>this._handleAppStateChange(nextAppState))
    
    this._current_offset = 0;
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', (nextAppState) =>this._handleAppStateChange(nextAppState));
    if(this._timer !== null) {
      clearTimeout(this._timer);
    }
  }

  _handleAppStateChange(nextAppState) {
    if(nextAppState == 'active') {
      this._reloadPage();
    }
  }

  _reloadPage() {
    // console.log(22222,this.state.placeSelected);
    if(!this.state.placeSelected) {
      this._picker.getPlace();
      return;
    }
    this._onRefreshToRequestFirstPageData(this.state.placeSelected.id);
  }

  _formatDate(timestamp,endTimestamp) {
    let _Date = new Date(timestamp);
    let _endDate = new Date(endTimestamp);
    let _date_format = [_Date.getMonth()+1 < 10 ? `0${_Date.getMonth()+1}`:_Date.getMonth()+1 ,_Date.getDate(),_Date.getFullYear()].join('-');
    let _endDate_format = '截止時間';

    // console.log(_date_format);
    let _getWeekDay = (date) => {
      let _week_day = null;
      switch(date) 
      { 
        case 0:_week_day = "星期日";break; 
        case 1:_week_day = "星期一";break; 
        case 2:_week_day = "星期二";break; 
        case 3:_week_day = "星期三";break; 
        case 4:_week_day = "星期四";break; 
        case 5:_week_day = "星期五";break; 
        case 6:_week_day = "星期六";break; 
        default:_week_day = "系统错误！" 
      } 
      return _week_day;
    }
    
    _endDate_format += ` ${_endDate.getHours()}:${_endDate.getMinutes()<10?`0${_endDate.getMinutes()}`:`${_endDate.getMinutes()}`} ${_endDate.getMonth()+1}月${_endDate.getDate()}日 ${_getWeekDay(_endDate.getDay())}`;
    
    this.setState({
      formatDate: {
        date: _date_format,
        week: _getWeekDay(_Date.getDay()),
        endDate: _endDate_format
      }
    });
  }
  //api
  _getDailyFoodList(placeId) {
      api.getDailyFoods(placeId, this.props.screenProps.sid).then(data => {
        if(data.status === 200 && data.data.ro.ok) {
          this.setState({
            foodDetails: data.data.data.foodList,
            loading: false,
            refreshing: false
          })
          this._formatDate(data.data.data.timestamp,data.data.data.endTimestamp);
        }
      },() => {
        this.setState({ isError: true, loading: false,refreshing: false });
      })
  }

  _onLoadingToRequestFirstPageData() {
    this.setState({loading: true});
    this._timer = setTimeout(() => {
      clearTimeout(this._timer);
      this._getDailyFoodList();
    }, 300)
  }

  _onRefreshToRequestFirstPageData() {
    this.setState({refreshing: true});
    this._timer = setTimeout(() => {
      clearTimeout(this._timer);
      this._getDailyFoodList();
    }, 800)
  }

  _onErrorToRetry = () => {
    this.setState({
      loading: true,
      isError: false
    });
    this._picker.getPlace();
  };

  getSeletedValue = (val) => {
    if(val == null) {
      // this._picker.getPlace();
      this.setState({ isError: true, loading: false });
      return;
    }
    this.setState({
      placeSelected: val,
      foodCount: 0,
      isBottomContainerShow: false
    })
    this._onLoadingToRequestFirstPageData(val.id);
    this.props.navigation.setParams({visible: true})
  }

  _goToOrder = () => {
    let {foodId,price} = this.state.foodDetails[0];
    let {placeSelected,foodCount} = this.state;
    if(this.props.screenProps.user !== null) {
      this.props.navigation.navigate("Order", {
          foodId,
          placeId: placeSelected.id,
          amount: foodCount,
          total: foodCount*price
      })
  }else {
    if(placeSelected.id){
      this.props.navigation.navigate("Login",{page:'Order',foodId,placeId: placeSelected.id,amount: foodCount,total: foodCount*price,reloadFunc: () => this._reloadWhenCancelLogin()});
    }
    }
  }

  _add() {
    this.setState({
      foodCount: this.state.foodCount + 1,
      isBottomContainerShow: true
    })
    this.props.navigation.setParams({visible: false})
  }

  _remove() {
    if(this.state.foodCount == 1) {
      this.props.navigation.setParams({visible: true})
      this.setState({
        isBottomContainerShow: false,
      })
    }
    if(this.state.foodCount == 0) {
      return ;
    }
    this.setState({
      foodCount: this.state.foodCount - 1
    })
  }

  _reloadWhenCancelLogin() {
    this._reloadPage();
  }

  _cancelOrder = () => {
    this.setState({
      isBottomContainerShow: false,
      foodCount: 0
    })
    this.props.navigation.setParams({visible: true})
  }

  _renderDateFormat() {
    return (
      <View style={HomePageStyles.DateFormatView}>
        <Text style={HomePageStyles.DateFormatWeekText} allowFontScaling={false}>
        {this.state.formatDate.week}的餐單</Text>
        <Text style={HomePageStyles.DateFormatDateText} allowFontScaling={false}>{this.state.formatDate.date}</Text>
      </View>
    )
  }

  _renderDeadLineDate() {
    return(
      <View style={HomePageStyles.DeadLineDateView}>
        <Text allowFontScaling={false} style={HomePageStyles.DeadLineDateText}>{this.state.formatDate.endDate}</Text>
      </View>
    )
  }

  _renderWarningView() {
    return (
      <WarningTips />
    )
  }

  // _renderItem({ item, index }) {
  //   return (
  //     <SliderEntry
  //       data={item}
  //       even={(index + 1) % 2 === 0}
  //       {...this["props"]}
  //     />
  //   );
  // }

  _renderIntroductionView() {
    let {foodDetails} = this.state;
    return (
      <View style={HomePageStyles.IntroductionView}>
        <Text style={HomePageStyles.IntroductionFoodName} numberOfLines={1} allowFontScaling={false}>{foodDetails[0].foodName}</Text>
        <Text style={HomePageStyles.IntroductionFoodBrief} numberOfLines={GLOBAL_PARAMS._winHeight>667? 4: 3} allowFontScaling={false}>{foodDetails[0].foodBrief}</Text>
      </View>
    )
  }

  _renderAddPriceView() {
    let {foodDetails} = this.state;
    return (
      <View style={HomePageStyles.AddPriceView}>
        <View style={HomePageStyles.AddPriceViewPriceContainer}>
          <Text allowFontScaling={false} style={HomePageStyles.AddPriceViewPriceUnit}>HKD</Text>
          <Text allowFontScaling={false} style={HomePageStyles.AddPriceViewPrice}>{foodDetails[0].price}</Text>
          <Text allowFontScaling={false} style={HomePageStyles.AddPriceViewOriginPrice}>HKD {foodDetails[0].originPrice}</Text>
          <View style={HomePageStyles.AddPriceViewStriping}/>
        </View>
        <View style={HomePageStyles.AddPriceViewCountContainer}>
            <TouchableOpacity onPress={() => this._remove()} style={HomePageStyles.AddPriceViewCommonBtn}>
            <Image source={require("../asset/remove.png")} style={HomePageStyles.AddPriceViewAddImage}/>
            </TouchableOpacity>
            <Text allowFontScaling={false} style={HomePageStyles.AddPriceViewCountText} numberOfLines={1}>{this.state.foodCount}</Text>
            <TouchableOpacity onPress={() => this._add()} style={HomePageStyles.AddPriceViewCommonBtn}>
                <Image source={require("../asset/add.png")} style={HomePageStyles.AddPriceViewRemoveImage}/>
            </TouchableOpacity>    
        </View>

      </View>
    )
  }

  _renderItemWithParallax({ item, index }, parallaxProps) {
    return (
      this.state.placeSelected != null ?
      <SliderEntry
        ref={(se) => this._SliderEntry = se}
        data={item}
        star={this.state.foodDetails[0].star}
        even={(index + 1) % 2 === 0}
        placeId={this.state.placeSelected.id}
        {...this.props}
        // parallax={true}
        // parallaxProps={parallaxProps}
      /> : null
    );
  }

  mainExample(number, title) {
    const { slider1ActiveSlide,foodDetails } = this.state;

    return foodDetails !== null  ? (
      <View style={[styles.exampleContainer, { marginTop: -15 }]}>
        {/*<Text style={[styles.title,{color:'#1a1917'}]}>商家列表</Text>*/}

        <Carousel
          ref={c => (this._slider1Ref = c)}
          data={foodDetails[0].extralImage}
          renderItem={this._renderItemWithParallax.bind(this)}
          sliderWidth={sliderWidth}
          itemWidth={itemWidth}
          hasParallaxImages={false}
          firstItem={SLIDER_1_FIRST_ITEM}
          inactiveSlideScale={0.94}
          inactiveSlideOpacity={0.5}
          // inactiveSlideShift={20}
          containerCustomStyle={styles.slider}
          contentContainerCustomStyle={styles.sliderContentContainer}
          loop={true}
          loopClonesPerSide={2}
          autoplay={false}
          autoplayDelay={3000}
          autoplayInterval={4000}
          onSnapToItem={index => this.setState({ slider1ActiveSlide: index })}
        />
      </View>
    ) : null;
  }

  _renderPlacePickerBtn() {
    return (
      <TouchableOpacity style={HomePageStyles.PlacePickerBtn} onPress={() => this.setState({showPlacePicker: true})}>
        <View style={HomePageStyles.PlacePickerBtnBgAbsolute}/>
        <Image source={require('../asset/icon-location.png')} style={HomePageStyles.PlacePickerBtnImage}/>
        <Text style={HomePageStyles.PlacePickerBtnText} numberOfLines={1} allowFontScaling={false}>
          {this.state.placeSelected.name}
        </Text>
      </TouchableOpacity>
    )
  }

  render() {
    const example1 = this.mainExample(
      1,
      `- ${this.state.i18n.recommend_text} -`
    );
    return (
      <Container style={HomePageStyles.ContainerBg}>
        <PlacePickerModel ref={c => this._picker = c} modalVisible={this.state.showPlacePicker} closeFunc={() => this.setState({showPlacePicker: false})} getSeletedValue={(val) => this.getSeletedValue(val)} {...this.props}/>
        <Header
          style={HomePageStyles.Header}
          iosBarStyle="light-content"
        >
        <LinearGradient colors={['#FF7F0B','#FF1A1A']} start={{x:0.0, y:0.0}} end={{x:1.0,y: 0.0}} style={HomePageStyles.linearGradient}>
          <TouchableOpacity onPress={() => this.props.navigation.navigate("DrawerOpen")} style={HomePageStyles.MenuBtn}>
            <Image source={require('../asset/menu.png')} style={HomePageStyles.MenuImage} resizeMode="contain"/>
            {/*<Image source={require('../asset/Oval.png')} style={{width: 10,height: 10,position: 'absolute',top: 10, right: 10}}/>*/}
          </TouchableOpacity>
          <View style={HomePageStyles.HeaderContent}>
          {this.state.placeSelected != null ? this._renderPlacePickerBtn() : <ActivityIndicator color={Colors.main_white} style={HomePageStyles.HeaderContentActivityIndicator} size="small"/>}
          </View>
        </LinearGradient>
        </Header>
        {this.state.isError ? (
          <ErrorPage
            errorToDo={this._onErrorToRetry}
            errorTips="加載失败,請點擊重試"
          />
        ) : null}
        {this.state.loading ? <Loading /> : null}
        {this.state.foodDetails != null && this.state.foodDetails.length >0  ? <BottomOrderConfirm {...this.props} 
        isShow={this.state.isBottomContainerShow} 
        total={this.state.foodCount*this.state.foodDetails[0].price}
        btnClick={this._goToOrder}
        cancelOrder={this._cancelOrder}/> : null}
        <ScrollView
        style={styles.scrollview}
        scrollEventThrottle={200}
        directionalLockEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={this.state.refreshing}
            onRefresh={() => this._onRefreshToRequestFirstPageData(this.state.placeSelected.id)}
          />
        }
        >
        {this.state.formatDate.week != '' ? this._renderDateFormat() : null}
        {/*this._renderWarningView()*/}
        {example1}
        {this.state.foodDetails != null ? this._renderIntroductionView() : null}
        {this.state.foodDetails != null ? this._renderAddPriceView() : null}
        {this.state.foodDetails != null ? this._renderDeadLineDate() : null}
        {this.state.foodDetails != null && this.state.foodDetails.length == 0 ? <BlankPage style={{marginTop:50}} message="暂无数据"/> : null}
        {<View style={HomePage.BottomView}/>}
        </ScrollView>
      </Container>
    );
  }
}

export default HotReloadHOC(HomePage);