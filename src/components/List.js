import '../styles/Base.css';
import '../styles/List.css';

import React from 'react';
import Masonry from 'react-masonry-component';
import { formatPattern } from 'react-router/lib/PatternUtils';

import config from 'config';

import { Account, Dialog, Item, Image, Loading, Login, Refresh, Message, Github } from '.';
import { BottomPosition, Storage, SupportPassive } from '../utils';


export default class List extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      currentPage: 0,
      isFirstLoadCompleted: false,
      lastId: 0,
      originalTitle: 'Pixivのラブライブ発見',
      newCount: 0,
      items: [],
      images: []
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.resizeListener.bind(this));
    window.addEventListener('scroll', this.scrollListener.bind(this), SupportPassive ? {
      passive: true
    } : false);

    this.fetchSource(true);
    this.resizeListener();
    setInterval(this.updateLatent.bind(this), 10e3);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeListener.bind(this));
    window.removeEventListener('scroll', this.scrollListener.bind(this));
  }

  scrollListener() {
    if (this.state.isLoading) {
      return;
    }

    if (BottomPosition(this) < 250) {
      this.fetchSource(false);
    }
  }

  onRefreshClick() {
    this.setState({
      items: [],
      images: [],
      newCount: 0
    });

    window.document.title = this.state.originalTitle;

    this.refresh.animate(true);

    this.fetchSource(true, () => {
      this.refresh.animate(false);
    });
  }

  fetchSource(isFirstLoad, callback = null) {
    if (this.state.isLoading) {
      return;
    }
    this.loading.show();
    this.error.hide();
    this.setState({
      isLoading: true
    });
    let currentPage = isFirstLoad ? 0 : this.state.currentPage;
    fetch(config.sourceURL + '?page=' + (++currentPage), {
      mode: 'cors',
      timeout: 15e3
    })
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
        this.loading.hide();
        this.error.show();
      })
      .then((data) => {
        if (data.status == 'success' && data.count > 0) {
          Object.keys(data.response).map((key) => {
            const elem = data.response[key];
            if (isFirstLoad && key == 0) {
              this.setState({
                lastId: elem.id
              });
            }
            this.setState({
              items: this.state.items.concat(elem),
              images: this.state.images.concat({
                uri: elem.image_urls.px_480mw,
                title: elem.title,
                link: formatPattern('/#/:illustId', {
                  illustId: elem.id
                })
              })
            });
          });
        } else {
          this.error.show();
        }
      })
      .then(() => {
        if (isFirstLoad) {
          this.setState({
            isFirstLoadCompleted: true
          });
        }
      })
      .then(() => {
        this.setState({
          isLoading: false,
          currentPage: currentPage
        })
      })
      .then(() => {
        typeof callback === 'function' && callback();
        this.loading.hide();
      })
      .catch(() => {
        this.loading.hide();
        this.error.show();
      });
  }

  resizeListener() {
    /* reset size of masonry-container when window size change */
    let node = this.root,
      cellClassName = 'cell';

    // try to get cell width
    let temp = document.createElement('div');
    temp.setAttribute('class', cellClassName);
    document.body.appendChild(temp);

    let cellWidth = temp.offsetWidth,
      cellMargin = 8,
      componentWidth = cellWidth + 2 * cellMargin,
      maxn = Math.floor(document.body.offsetWidth / componentWidth);

    node.style.width = String(maxn * componentWidth + 'px');
    document.body.removeChild(temp);
  }

  updateLatent() {
    if (this.state.isFirstLoadCompleted && this.state.lastId != 0) {
      fetch(config.sourceURL + '?last=' + this.state.lastId, {
        mode: 'cors'
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
        })
        .then((data) => {
          if (data.status == 'success' && data.new_latent_count) {
            let count = data.new_latent_count;
            if (count > 0) {
              setTimeout(() => {
                for (let key in data.response) {
                  const elem = data.response[key];
                  if (key == count) {
                    break;
                  }
                  if (key == 0) {
                    this.setState({
                      lastId: elem.id
                    });
                  }
                  this.setState({
                    newCount: this.state.newCount + 1
                  });
                }

                window.document.title = '(' + this.state.newCount + ') ' + this.state.originalTitle;
              }, 1500);
            }
          }
        });
    }
  }

  onFavouriteClick(illustId) {
    const authData = Storage.get('auth');
    if (authData == null || authData.expires_time < new Date().getTime()) {
      return this.login.open();
    }
    fetch(config.favouriteURL, {
      mode: 'cors',
      method: 'post',
      headers: new Headers({
        'Accept': 'application/json',
        'Content-Type': 'text/plain',
        'Access-Token': authData.access_token
      }),
      body: JSON.stringify({
        illust_id: illustId
      })
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
      })
      .then((data) => {
        this.dialog.setContent(data.message);
      });
  }

  render() {
    return (
      <div
        ref={ (ref) => this.root = ref }
        style={ { margin: '0 auto' } }>
        <Github link={ config.projectLink } />
        <Masonry
          className={ 'masonry' }
          elementType={ 'div' }
          options={ { transitionDuration: 0 } }
          disableImagesLoaded={ false }
          updateOnEachImageLoad={ false }>
          { this.state.items.map((elem, index) => {
              return <Item
                       key={ index }
                       item={ elem }
                       onImageClick={ () => this.image.openLightbox(index) }
                       onFavouriteClick={ () => this.onFavouriteClick(elem.id) } />
            }) }
        </Masonry>
        <Loading ref={ (ref) => this.loading = ref } />
        <Message
          ref={ (ref) => this.error = ref }
          text={ '読み込みに失敗しました' }
          isHidden={ true } />
        <Refresh
          ref={ (ref) => this.refresh = ref }
          onClick={ this.onRefreshClick.bind(this) } />
        <Account onClick={ () => this.login.open() } />
        <Image
          ref={ (ref) => this.image = ref }
          images={ this.state.images } />
        <Login ref={ (ref) => this.login = ref } />
        <Dialog ref={ (ref) => this.dialog = ref } />
      </div>
      );
  }
}
